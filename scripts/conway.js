"use strict";

(() => {
    M.AutoInit();
    var instance = M.Modal.getInstance(document.getElementById("modal1"));
    instance.open();

    // This needs to be higher than the animation time in css.
    const MIN_TICK_TIME = 350;
    const MAX_TICK_TIME = 3000;

    const grid = document.getElementById("grid");

    const control_bar = document.getElementById("control-bar");
    const nav_content_bar = document.getElementById("nav-content-container");

    const simulate_button = document.getElementById("start-button");
    const simulate_button_icon = document.getElementById("simulate-button-icon");
    const simulate_button_text = document.getElementById("simulate-button-text");

    const clear_button = document.getElementById("clear-button");

    let cached_grid_size = [Math.floor((window.innerHeight - control_bar.offsetHeight) / 25), Math.floor(window.innerWidth / 25)];

    let game_grid = null;
    let back_buffer = null;
    let drag_grid_state = null;

    let is_simulating = false;
    let is_mouse_down = false;

    let speed_updated = false;
    let slider_speed = 50;

    let grid_locked = false;

    populate_grid();
    // update_cell_views();

    let interval = setInterval(tick, get_simulate_speed());

    simulate_button.onclick = toggle_simulate;
    clear_button.onclick = clear_grid;

    nav_content_bar.ondragstart = (event) => {
        event.preventDefault();
    };

    document.getElementById("speed-slider").oninput = (event) => {
        speed_updated = true;
        slider_speed = event.srcElement.value;
    };

    document.onmousedown = (ev) => {
        is_mouse_down = true;
    };


    document.onmouseup = (ev) => {
        is_mouse_down = false;
    };

    function tick() {
        if (!is_simulating) {
            return;
        }

        for (let i = 0; i < get_num_cells(); i++) {
            let coord = id_to_coord(i);
            let [row, col] = coord;

            let neighbors = get_alive_neighbors(...coord);
            let count = neighbors.length;
            let prev_state = game_grid[row][col];
            if (count == 3) {
                back_buffer[row][col] = true;
            } else if (count > 3) {
                back_buffer[row][col] = false;
            } else if (count < 2) {
                back_buffer[row][col] = false;
            } else {
                back_buffer[row][col] = prev_state;
            }

            // Reset the drag grid if the cell was flipped.
            if (prev_state != back_buffer[row][col]) {
                drag_grid_state[row][col] = false;
            }
        }

        let tmp = back_buffer;
        back_buffer = game_grid;
        game_grid = tmp;

        update_cell_views();

        if (speed_updated) {
            clearInterval(interval);
            interval = setInterval(tick, get_simulate_speed());
            speed_updated = false;
        }
    }

    function populate_grid() {
        let dims = get_grid_size();
        let [rows, cols] = dims;
        let n = get_num_cells();

        game_grid = new Array(dims[0]);
        back_buffer = Array.from(game_grid);
        drag_grid_state = Array.from(game_grid);
        for (let i = 0; i < dims[0]; i++) {
            let row = new Array(dims[1]);
            row.fill(false);

            game_grid[i] = row;
            back_buffer[i] = Array.from(row);
            drag_grid_state[i] = Array.from(row);
        }

        for (let r = 0; r < rows; r++) {
            let row_el = document.createElement("tr");
            grid.appendChild(row_el);
            for (let c = 0; c < cols; c++) {
                let el = document.createElement("td");
                el.classList.add("grid-square");

                let toggle_func = (ev) => {
                    // Prevents the default behavior of drag and drop.
                    ev.preventDefault();
                    let coord = [r, c];
                    game_grid[coord[0]][coord[1]] = !game_grid[coord[0]][coord[1]];
                    set_cell_view(...coord);

                };

                el.onmousedown = (ev) => {
                    clear_drag_grid();
                    drag_grid_state[r][c] = true;
                    toggle_func(ev);
                };
                el.onmouseenter = (ev) => {
                    if (is_mouse_down && !drag_grid_state[r][c]) {
                        toggle_func(ev);
                        drag_grid_state[r][c] = true;
                    }
                };

                row_el.appendChild(el);
            }
        }
    }

    function update_cell_views() {
        for (let i = 0; i < get_num_cells(); i++) {
            let coord = id_to_coord(i);
            set_cell_view(...coord);
        }
    }

    function toggle_cell(id) {
        let coord = id_to_coord(id);
        game_grid[coord[0]][coord[1]] = !game_grid[coord[0]][coord[1]];
        set_cell_view(...coord);
    }

    function set_cell_view(row, col) {
        let id = coord_to_id(row, col);
        let cell = grid.childNodes.item(row).childNodes.item(col);
        if (game_grid[row][col]) {
            cell.classList.add("alive");
            cell.classList.remove("dead");
        } else {
            if (cell.classList.contains("alive")) {
                cell.classList.remove("alive");
                cell.classList.add("dead");
            }

        }
    }

    function get_neighbors(row, col) {
        let neighbors = [];
        let [h, w] = get_grid_size();

        neighbors.push([row - 1, col]);
        neighbors.push([row - 1, col - 1]);
        neighbors.push([row - 1, col + 1]);

        neighbors.push([row, col - 1]);
        neighbors.push([row, col + 1]);

        neighbors.push([row + 1, col]);
        neighbors.push([row + 1, col - 1]);
        neighbors.push([row + 1, col + 1]);

        return neighbors.filter(([r, c]) => {
            return r >= 0 && c >= 0 && r < h && c < w;
        });
    }

    function get_alive_neighbors(row, col) {
        let neighbors = get_neighbors(row, col);
        return neighbors.filter(([r, c]) => {
            return game_grid[r][c];
        });
    }

    function id_to_coord(id) {
        let grid_size = get_grid_size();
        return [Math.floor(id / grid_size[1]), (id % grid_size[1])];
    }

    function coord_to_id(row, col) {
        let grid_size = get_grid_size();
        return grid_size[1] * row + col;
    }

    function get_grid_size() {
        // rows * columns
        return cached_grid_size;

    }

    function get_num_cells() {
        let size = get_grid_size();
        return size[0] * size[1];
    }

    function get_simulate_speed() {
        return MIN_TICK_TIME + (100 - slider_speed) / 100 * (MAX_TICK_TIME - MIN_TICK_TIME);
    }

    function swap_buffer() {
        let tmp = back_buffer;
        back_buffer = game_grid;
        game_grid = tmp;
    }

    function set_simulating(v) {
        is_simulating = v;
        if (is_simulating) {
            simulate_button_icon.innerText = "pause";
            simulate_button_text.innerText = "Halt Simulation"
        } else {
            simulate_button_icon.innerText = "play_arrow";
            simulate_button_text.innerText = "Begin Simulation"
        }
    }

    function toggle_simulate() {
        set_simulating(!is_simulating);
    }

    function clear_grid() {
        for (let i = 0; i < get_num_cells(); i++) {
            let coord = id_to_coord(i);
            let [row, col] = coord;
            back_buffer[row][col] = false;
        }

        set_simulating(false);
        swap_buffer();
        update_cell_views();
    }

    function clear_drag_grid() {
        let [row, col] = get_grid_size();
        for (let i = 0; i < row; i++) {
            for (let j = 0; j < col; j++) {
                drag_grid_state[i][j] = false;
            }
        }
    }
})();
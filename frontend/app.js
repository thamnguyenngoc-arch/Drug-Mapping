// =========================
// app.js
// =========================

const API_URL = "http://127.0.0.1:8000";

// =========================
// ELEMENTS
// =========================

const fileAInput = document.getElementById("fileA");
const fileBInput = document.getElementById("fileB");

const sourceColumnsDiv = document.getElementById("sourceColumns");
const targetColumnsDiv = document.getElementById("targetColumns");

const mappingContainer = document.getElementById("mappingContainer");

const addMappingBtn = document.getElementById("addMapping");
console.log(addMappingBtn);

const runMappingBtn = document.getElementById("runMapping");

const exportExcelBtn = document.getElementById("exportExcel");

const weightTotalText = document.getElementById("weightTotal");

const weightWarning = document.getElementById("weightWarning");

const statusText = document.getElementById("statusText");

const thresholdInput = document.getElementById("threshold");

// =========================
// GLOBAL DATA
// =========================

let sourceColumns = [];

let targetColumns = [];

let latestResult = [];

// =========================
// AG GRID
// =========================

const gridOptions = {

    defaultColDef: {

        sortable: true,

        filter: true,

        floatingFilter: true,

        resizable: true,

        minWidth: 150

    },

    rowData: [],

    columnDefs: [],

    animateRows: true

};

const gridDiv = document.getElementById(
    "mappingGrid"
);

new agGrid.Grid(
    gridDiv,
    gridOptions
);

// =========================
// LOAD FILE COLUMNS
// =========================

async function loadColumns(file) {

    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    const response = await fetch(

        `${API_URL}/columns`,

        {

            method: "POST",

            body: formData

        }

    );

    const data = await response.json();

    return data.columns;

}

// =========================
// POPULATE CHECKBOXES
// =========================

function populateCheckboxes(

    container,
    columns,
    className

) {

    container.innerHTML = "";

    columns.forEach(col => {

        const label = document.createElement("label");

        label.className = "checkbox-item";

        label.innerHTML = `

            <input
                type="checkbox"
                class="${className}"
                value="${col}"
            />

            ${col}

        `;

        container.appendChild(label);

    });

}

// =========================
// FILE A CHANGE
// =========================

fileAInput.addEventListener(

    "change",

    async (e) => {

        const file = e.target.files[0];

        if (!file) return;

        statusText.innerText =
            "Loading source columns...";

        sourceColumns = await loadColumns(file);

        populateCheckboxes(

            sourceColumnsDiv,

            sourceColumns,

            "source-export"

        );

        if (
            document.querySelectorAll(".mapping-row")
                .length === 0
        ) {

            addMappingRow();

        }

        statusText.innerText =
            "Source file loaded";

    }

);

// =========================
// FILE B CHANGE
// =========================

fileBInput.addEventListener(

    "change",

    async (e) => {

        const file = e.target.files[0];

        if (!file) return;

        statusText.innerText =
            "Loading target columns...";

        targetColumns = await loadColumns(file);

        populateCheckboxes(

            targetColumnsDiv,

            targetColumns,

            "target-export"

        );

        if (
            document.querySelectorAll(".mapping-row")
                .length === 0
        ) {

            addMappingRow();

        }

        statusText.innerText =
            "Target file loaded";

    }

);

// =========================
// CREATE SELECT OPTIONS
// =========================

function createOptions(columns) {

    return columns.map(col => {

        return `

            <option value="${col}">
                ${col}
            </option>

        `;

    }).join("");

}

// =========================
// ADD MAPPING ROW
// =========================

function addMappingRow() {

    // =========================
    // VALIDATE COLUMNS
    // =========================

    if (
        sourceColumns.length === 0 ||
        targetColumns.length === 0
    ) {

        alert(
            "Please upload both files first"
        );

        return;
    }

    const row = document.createElement("div");

    row.className =
        "row mapping-row";

    row.innerHTML = `

        <select class="source-select">

            ${createOptions(sourceColumns)}

        </select>

        <select class="target-select">

            ${createOptions(targetColumns)}

        </select>

        <input
            type="number"
            class="weight-input"
            value="1"
            min="0"
            max="1"
            step="0.01"
        />

        <button
            type="button"
            class="remove-btn danger"
        >

            Remove

        </button>

    `;

    mappingContainer.appendChild(row);

    // =========================
    // REMOVE ROW
    // =========================

    row.querySelector(".remove-btn")
        .addEventListener(

            "click",

            () => {

                row.remove();

                updateWeightTotal();

            }

        );

    // =========================
    // WEIGHT CHANGE
    // =========================

    row.querySelector(".weight-input")
        .addEventListener(

            "input",

            updateWeightTotal

        );

    updateWeightTotal();

}

// =========================
// UPDATE WEIGHT TOTAL
// =========================

function updateWeightTotal() {

    const weightInputs = document.querySelectorAll(
        ".weight-input"
    );

    let total = 0;

    weightInputs.forEach(input => {

        total += parseFloat(
            input.value || 0
        );

    });

    total = Number(
        total.toFixed(2)
    );

    weightTotalText.innerText = total;

    if (total !== 1) {

        weightWarning.innerText =
            "Total weight must equal 1";

    }

    else {

        weightWarning.innerText = "";

    }

}

// =========================
// ADD MAPPING BUTTON
// =========================

addMappingBtn.addEventListener(

    "click",

    () => {

        if (
            sourceColumns.length === 0 ||
            targetColumns.length === 0
        ) {

            alert(
                "Please upload both files first"
            );

            return;

        }

        addMappingRow();

    }

);

// =========================
// GET MAPPING CONFIG
// =========================

function getMappingConfig() {

    const rows = document.querySelectorAll(
        ".mapping-row"
    );

    const config = [];

    rows.forEach(row => {

        config.push({

            source: row.querySelector(
                ".source-select"
            ).value,

            target: row.querySelector(
                ".target-select"
            ).value,

            weight: parseFloat(

                row.querySelector(
                    ".weight-input"
                ).value

            )

        });

    });

    return config;

}

// =========================
// GET EXPORT COLUMNS
// =========================

function getExportColumns() {

    const sourceSelected = [

        ...document.querySelectorAll(
            ".source-export:checked"
        )

    ].map(x => x.value);

    const targetSelected = [

        ...document.querySelectorAll(
            ".target-export:checked"
        )

    ].map(x => x.value);

    return {

        source: sourceSelected,

        target: targetSelected

    };

}

// =========================
// RUN MAPPING
// =========================

runMappingBtn.addEventListener(

    "click",

    async () => {

        // =========================
        // VALIDATE FILES
        // =========================

        if (
            !fileAInput.files[0] ||
            !fileBInput.files[0]
        ) {

            alert(
                "Please upload both files"
            );

            return;

        }

        // =========================
        // VALIDATE WEIGHT
        // =========================

        const totalWeight = parseFloat(
            weightTotalText.innerText
        );

        if (totalWeight !== 1) {

            alert(
                "Total weight must equal 1"
            );

            return;

        }

        // =========================
        // GET CONFIG
        // =========================

        const mappingConfig =
            getMappingConfig();

        const exportColumns =
            getExportColumns();

        const threshold = parseFloat(
            thresholdInput.value
        );

        // =========================
        // BUILD FORM DATA
        // =========================

        const formData = new FormData();

        formData.append(

            "file_a",

            fileAInput.files[0]

        );

        formData.append(

            "file_b",

            fileBInput.files[0]

        );

        formData.append(

            "mapping_config",

            JSON.stringify(mappingConfig)

        );

        formData.append(

            "export_columns",

            JSON.stringify(exportColumns)

        );

        formData.append(

            "threshold",

            threshold

        );

        // =========================
        // CALL API
        // =========================

        statusText.innerText =
            "Running mapping...";

        runMappingBtn.disabled = true;

        try {

            const response = await fetch(

                `${API_URL}/map`,

                {

                    method: "POST",

                    body: formData

                }

            );

            const data = await response.json();

            // =========================
            // API ERROR
            // =========================

            if (data.error) {

                alert(data.error);

                return;

            }

            latestResult = data;

            // =========================
            // EMPTY RESULT
            // =========================

            if (!data.length) {

                alert(
                    "No result returned"
                );

                return;

            }

            // =========================
            // BUILD GRID COLUMNS
            // =========================

            const columnDefs = Object.keys(
                data[0]
            ).map(col => {

                return {

                    field: col

                };

            });

            gridOptions.api.setGridOption(

                "columnDefs",

                columnDefs

            );

            // =========================
            // SET GRID DATA
            // =========================

            gridOptions.api.setGridOption(

                "rowData",

                data

            );

            statusText.innerText =

                `Completed ${data.length} rows`;

        }

        catch (error) {

            console.error(error);

            alert(
                "Mapping failed"
            );

        }

        finally {

            runMappingBtn.disabled = false;

        }

    }

);

// =========================
// EXPORT EXCEL
// =========================

exportExcelBtn.addEventListener(

    "click",

    () => {

        if (!latestResult.length) {

            alert(
                "No mapping result"
            );

            return;

        }

        gridOptions.api.exportDataAsExcel({

            fileName: "mapping_result.xlsx"

        });

    }

);
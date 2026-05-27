// =========================
// app.js
// =========================

const fileAInput =
  document.getElementById("fileA");

const fileBInput =
  document.getElementById("fileB");

const sourceColumnsDiv =
  document.getElementById("sourceColumns");

const targetColumnsDiv =
  document.getElementById("targetColumns");

const mappingContainer =
  document.getElementById("mappingContainer");

const addMappingBtn =
  document.getElementById("addMapping");

const runMappingBtn =
  document.getElementById("runMapping");

const weightTotal =
  document.getElementById("weightTotal");

const statusText =
  document.getElementById("statusText");

const progressBar =
  document.getElementById("progressBar");

const progressPercent =
  document.getElementById("progressPercent");

let gridApi = null;

// =========================
// STORE COLUMNS
// =========================

let sourceColumns = [];
let targetColumns = [];

// =========================
// AG GRID
// =========================

const gridOptions = {

  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  },

  rowData: [],

  columnDefs: []

};

const gridDiv =
  document.getElementById("mappingGrid");

gridApi =
  agGrid.createGrid(
    gridDiv,
    gridOptions
  );

// =========================
// LOAD COLUMNS
// =========================

async function loadColumns(file) {

  const formData =
    new FormData();

  formData.append("file", file);

  const response =
    await fetch(
      "http://127.0.0.1:8000/columns",
      {
        method: "POST",
        body: formData
      }
    );

  const data =
    await response.json();

  return data.columns;

}

// =========================
// POPULATE SOURCE
// =========================

function populateSourceColumns(columns) {

  sourceColumnsDiv.innerHTML = "";

  columns.forEach(col => {

    const wrapper =
      document.createElement("label");

    wrapper.className =
      "checkbox-item";

    wrapper.innerHTML = `

      <input
        type="checkbox"
        class="source-export"
        value="${col}"
      />

      ${col}

    `;

    sourceColumnsDiv.appendChild(
      wrapper
    );

  });

}

// =========================
// POPULATE TARGET
// =========================

function populateTargetColumns(columns) {

  targetColumnsDiv.innerHTML = "";

  columns.forEach(col => {

    const wrapper =
      document.createElement("label");

    wrapper.className =
      "checkbox-item";

    wrapper.innerHTML = `

      <input
        type="checkbox"
        class="target-export"
        value="${col}"
      />

      ${col}

    `;

    targetColumnsDiv.appendChild(
      wrapper
    );

  });

}

// =========================
// FILE A EVENT
// =========================

fileAInput.addEventListener(
  "change",
  async (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    statusText.innerText =
      "Loading source columns...";

    try {

      const columns =
        await loadColumns(file);

      sourceColumns =
        columns;

      populateSourceColumns(
        columns
      );

      statusText.innerText =
        `Loaded ${columns.length} source columns`;

    } catch (err) {

      console.error(err);

      statusText.innerText =
        "Failed to load source columns";

    }

  }
);

// =========================
// FILE B EVENT
// =========================

fileBInput.addEventListener(
  "change",
  async (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    statusText.innerText =
      "Loading target columns...";

    try {

      const columns =
        await loadColumns(file);

      targetColumns =
        columns;

      populateTargetColumns(
        columns
      );

      statusText.innerText =
        `Loaded ${columns.length} target columns`;

    } catch (err) {

      console.error(err);

      statusText.innerText =
        "Failed to load target columns";

    }

  }
);

// =========================
// UPDATE WEIGHT
// =========================

function updateWeightTotal() {

  const weightInputs =
    document.querySelectorAll(
      ".weight-input"
    );

  let total = 0;

  weightInputs.forEach(input => {

    total += parseFloat(
      input.value || 0
    );

  });

  weightTotal.innerText =
    total.toFixed(2);

}

// =========================
// ADD MAPPING
// =========================

addMappingBtn.addEventListener(
  "click",
  () => {

    const row =
      document.createElement("div");

    row.className =
      "mapping-row";

    const sourceOptions =
      sourceColumns
        .map(
          col =>
            `<option value="${col}">
              ${col}
            </option>`
        )
        .join("");

    const targetOptions =
      targetColumns
        .map(
          col =>
            `<option value="${col}">
              ${col}
            </option>`
        )
        .join("");

    row.innerHTML = `

      <select class="source-column">
        ${sourceOptions}
      </select>

      <span>→</span>

      <select class="target-column">
        ${targetOptions}
      </select>

      <input
        type="number"
        class="weight-input"
        value="0"
        step="0.1"
        min="0"
        max="1"
      />

      <button class="remove-btn">
        X
      </button>

    `;

    mappingContainer.appendChild(
      row
    );

    const weightInput =
      row.querySelector(
        ".weight-input"
      );

    weightInput.addEventListener(
      "input",
      updateWeightTotal
    );

    const removeBtn =
      row.querySelector(
        ".remove-btn"
      );

    removeBtn.addEventListener(
      "click",
      () => {

        row.remove();

        updateWeightTotal();

      }
    );

    updateWeightTotal();

  }
);

// =========================
// BUILD CONFIG
// =========================

function getMappingConfig() {

  const rows =
    document.querySelectorAll(
      ".mapping-row"
    );

  const config = [];

  rows.forEach(row => {

    const source =
      row.querySelector(
        ".source-column"
      ).value;

    const target =
      row.querySelector(
        ".target-column"
      ).value;

    const weight =
      parseFloat(
        row.querySelector(
          ".weight-input"
        ).value || 0
      );

    config.push({
      source,
      target,
      weight
    });

  });

  return config;

}

// =========================
// EXPORT COLUMNS
// =========================

function getExportColumns() {

  const source =
    Array.from(
      document.querySelectorAll(
        ".source-export:checked"
      )
    ).map(x => x.value);

  const target =
    Array.from(
      document.querySelectorAll(
        ".target-export:checked"
      )
    ).map(x => x.value);

  return {
    source,
    target
  };

}

// =========================
// PROGRESS BAR
// =========================

function setProgress(percent) {

  progressBar.style.width =
    `${percent}%`;

  progressPercent.innerText =
    `${percent}%`;

}

// =========================
// RUN MAPPING
// =========================

runMappingBtn.addEventListener(
  "click",
  async () => {

    const fileA =
      fileAInput.files[0];

    const fileB =
      fileBInput.files[0];

    if (!fileA || !fileB) {

      alert(
        "Please upload both files"
      );

      return;

    }

    const mappingConfig =
      getMappingConfig();

    const exportColumns =
      getExportColumns();

    console.log(
      "mappingConfig",
      mappingConfig
    );

    console.log(
      "exportColumns",
      exportColumns
    );

    const totalWeight =
      mappingConfig.reduce(
        (sum, x) =>
          sum + Number(x.weight),
        0
      );

    if (
      Math.abs(totalWeight - 1) > 0.01
    ) {

      alert(
        "Total weight should equal 1"
      );

      return;

    }

    statusText.innerText =
      "Preparing mapping...";

    setProgress(5);

    const formData =
      new FormData();

    formData.append(
      "file_a",
      fileA
    );

    formData.append(
      "file_b",
      fileB
    );

    formData.append(
      "mapping_config",
      JSON.stringify(
        mappingConfig
      )
    );

    formData.append(
      "export_columns",
      JSON.stringify(
        exportColumns
      )
    );

    try {

      // fake progress animation

      let currentProgress = 5;

      const progressInterval =
        setInterval(() => {

          if (currentProgress < 90) {

            currentProgress += 5;

            setProgress(
              currentProgress
            );

          }

        }, 500);

      statusText.innerText =
        "Running mapping...";

      const response =
        await fetch(
          "http://127.0.0.1:8000/map",
          {
            method: "POST",
            body: formData
          }
        );

      clearInterval(
        progressInterval
      );

      setProgress(100);

      const data =
        await response.json();

      if (!data.results) {

        statusText.innerText =
          "No result";

        return;

      }

      if (
        data.results.length === 0
      ) {

        statusText.innerText =
          "No rows returned";

        return;

      }

      const firstRow =
        data.results[0];

      const columnDefs =
        Object.keys(firstRow).map(
          col => ({
            field: col
          })
        );

      gridApi.setGridOption(
        "columnDefs",
        columnDefs
      );

      gridApi.setGridOption(
        "rowData",
        data.results
      );

      statusText.innerText =
        `Done: ${data.results.length} rows`;

    } catch (err) {

      console.error(err);

      statusText.innerText =
        "Mapping failed";

    }

  }
);
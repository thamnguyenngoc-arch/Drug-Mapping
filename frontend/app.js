// ====================================
// THRESHOLD SLIDER
// ====================================

const thresholdSlider =
  document.getElementById("thresholdSlider");

const thresholdValue =
  document.getElementById("thresholdValue");

thresholdSlider.addEventListener("input", () => {

  thresholdValue.innerText =
    thresholdSlider.value;

});

// ====================================
// WEIGHT VALIDATION
// ====================================

function updateWeightTotal() {

  const inputs =
    document.querySelectorAll(".weight-input");

  let total = 0;

  inputs.forEach(input => {

    total += parseFloat(input.value || 0);

  });

  total = Number(total.toFixed(2));

  document.getElementById(
    "weightTotal"
  ).innerText = total;

  const totalElement =
    document.getElementById("weightTotal");

  if (total === 1) {

    totalElement.style.color = "green";

  } else {

    totalElement.style.color = "red";

  }

}

function validateWeights() {

  const inputs =
    document.querySelectorAll(".weight-input");

  let total = 0;

  inputs.forEach(input => {

    total += parseFloat(input.value || 0);

  });

  total = Number(total.toFixed(2));

  if (total !== 1) {

    alert(
      `Total weight must equal 1\nCurrent: ${total}`
    );

    return false;
  }

  return true;
}

// ====================================
// LISTEN WEIGHT INPUTS
// ====================================

document.addEventListener("input", (e) => {

  if (
    e.target.classList.contains("weight-input")
  ) {
    updateWeightTotal();
  }

});

// ====================================
// AG GRID
// ====================================

const gridOptions = {

  rowData: [],

  rowSelection: {
    mode: "multiRow"
  },

  pagination: true,

  animateRows: true,

  theme: "legacy",

  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1
  }

};

const gridDiv =
  document.querySelector("#myGrid");

const gridApi =
  agGrid.createGrid(gridDiv, gridOptions);

// ====================================
// ADD MAPPING ROW
// ====================================

const addMappingBtn =
  document.getElementById("addMappingBtn");

const mappingContainer =
  document.getElementById("mappingContainer");

addMappingBtn.addEventListener("click", () => {

  const row =
    document.createElement("div");

  row.className = "mapping-row";

  row.innerHTML = `

    <select class="source-column"></select>

    <span>→</span>

    <select class="target-column"></select>

    <input
      type="number"
      class="weight-input"
      value="0"
      step="0.1"
      min="0"
      max="1"
    />

  `;

  mappingContainer.appendChild(row);

  updateWeightTotal();

});

// ====================================
// LOAD COLUMNS
// ====================================

async function loadColumns(file) {

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch("/columns", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  return data.columns;
}

// ====================================
// POPULATE SOURCE COLUMNS
// ====================================

function populateSourceColumns(columns) {

  const selects =
    document.querySelectorAll(
      ".source-column"
    );

  selects.forEach(select => {

    select.innerHTML = "";

    columns.forEach(col => {

      const option =
        document.createElement("option");

      option.value = col;
      option.innerText = col;

      select.appendChild(option);

    });

  });

}

// ====================================
// POPULATE TARGET COLUMNS
// ====================================

function populateTargetColumns(columns) {

  const selects =
    document.querySelectorAll(
      ".target-column"
    );

  selects.forEach(select => {

    select.innerHTML = "";

    columns.forEach(col => {

      const option =
        document.createElement("option");

      option.value = col;
      option.innerText = col;

      select.appendChild(option);

    });

  });

}

// ====================================
// EXPORT COLUMNS
// ====================================

function populateExportColumns(columns, type) {

  const container =
    type === "source"
      ? document.getElementById("sourceExportColumns")
      : document.getElementById("targetExportColumns");

  container.innerHTML = "";

  columns.forEach(col => {

    const div =
      document.createElement("div");

    div.innerHTML = `

      <label>

        <input
          type="checkbox"
          class="export-checkbox"
          data-type="${type}"
          value="${col}"
          checked
        />

        ${col}

      </label>

    `;

    container.appendChild(div);

  });

}

// ====================================
// FILE UPLOAD EVENTS
// ====================================

document
  .getElementById("fileA")
  .addEventListener(
    "change",
    async (e) => {

      const file = e.target.files[0];

      const columns =
        await loadColumns(file);

      console.log("DF_A columns:", columns);

      populateSourceColumns(columns);

      populateExportColumns(
        columns,
        "source"
      );

    }
  );

document
  .getElementById("fileB")
  .addEventListener(
    "change",
    async (e) => {

      const file = e.target.files[0];

      const columns =
        await loadColumns(file);

      console.log("DF_B columns:", columns);

      populateTargetColumns(columns);

      populateExportColumns(
        columns,
        "target"
      );

    }
  );

// ====================================
// GET MAPPING CONFIG
// ====================================

function getMappingConfig() {

  const rows =
    document.querySelectorAll(".mapping-row");

  const config = [];

  rows.forEach(row => {

    config.push({

      source:
        row.querySelector(".source-column").value,

      target:
        row.querySelector(".target-column").value,

      weight: parseFloat(
        row.querySelector(".weight-input").value
      )

    });

  });

  return config;
}

// ====================================
// GET EXPORT COLUMNS
// ====================================

function getExportColumns() {

  const source = [];
  const target = [];

  document
    .querySelectorAll(".export-checkbox")
    .forEach(cb => {

      if (cb.checked) {

        if (cb.dataset.type === "source") {

          source.push(cb.value);

        } else {

          target.push(cb.value);

        }

      }

    });

  return {
    source,
    target
  };
}

// ====================================
// RUN MAPPING
// ====================================

async function runMapping() {

  try {

    if (!validateWeights()) {
      return;
    }

    const fileA =
      document.getElementById("fileA").files[0];

    const fileB =
      document.getElementById("fileB").files[0];

    if (!fileA || !fileB) {

      alert("Please upload both files");

      return;

    }

    const runButton =
      document.querySelector(".primary-btn");

    runButton.disabled = true;

    runButton.innerText =
      "Running Mapping...";

    const mappingConfig =
      getMappingConfig();

    const exportColumns =
      getExportColumns();

    const formData = new FormData();

    formData.append("file_a", fileA);

    formData.append("file_b", fileB);

    formData.append(
      "mapping_config",
      JSON.stringify(mappingConfig)
    );

    formData.append(
      "export_columns",
      JSON.stringify(exportColumns)
    );

    console.log("RUN MAPPING CLICKED");

    console.log("SENDING REQUEST /map");

    const response = await fetch("/map", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {

      throw new Error("API Error");

    }

    const data =
      await response.json();

    console.log(data);

    // ====================================
    // DYNAMIC GRID COLUMNS
    // ====================================

    const columns =
      Object.keys(data[0] || {});

    const columnDefs =
      columns.map(col => ({

        field: col,

        headerName: col,

        sortable: true,

        filter: true,

        resizable: true,

        flex: 1

      }));

    gridApi.setGridOption(
      "columnDefs",
      columnDefs
    );

    gridApi.setGridOption(
      "rowData",
      data
    );

    // ====================================
    // SUMMARY
    // ====================================

    updateSummary(data);

    runButton.disabled = false;

    runButton.innerText =
      "Run Mapping";

  } catch (error) {

    console.error(error);

    alert("Error running mapping");

    const runButton =
      document.querySelector(".primary-btn");

    runButton.disabled = false;

    runButton.innerText =
      "Run Mapping";

  }

}

// ====================================
// UPDATE SUMMARY
// ====================================

function updateSummary(data) {

  const total =
    data.length;

  const matched =
    data.filter(
      x => x.status === "Matched"
    ).length;

  const review =
    data.filter(
      x => x.status === "Review"
    ).length;

  const unmatched =
    data.filter(
      x => x.status === "Unmatched"
    ).length;

  document.getElementById(
    "totalRows"
  ).innerText = total;

  document.getElementById(
    "matchedRows"
  ).innerText = matched;

  document.getElementById(
    "reviewRows"
  ).innerText = review;

  document.getElementById(
    "unmatchedRows"
  ).innerText = unmatched;

}

// ====================================
// RUN BUTTON
// ====================================

document
  .querySelector(".primary-btn")
  .addEventListener(
    "click",
    runMapping
  );

// ====================================
// INIT
// ====================================

updateWeightTotal();
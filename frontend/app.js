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

const columnDefs = [

  {
    field: "source_name",
    headerName: "Source Product",
    flex: 2,
  },

  {
    field: "matched_name",
    headerName: "Matched Product",
    flex: 2,
  },

  {
    field: "score",
    headerName: "Score",
    width: 120,

    sortable: true,

    cellStyle: params => {

      const score = params.value;

      if (score >= 95) {

        return {
          backgroundColor: "#dcfce7",
          fontWeight: "bold"
        };

      }

      if (score >= 80) {

        return {
          backgroundColor: "#fef9c3"
        };

      }

      return {
        backgroundColor: "#fee2e2"
      };

    }
  },

  {
    field: "unit",
    headerName: "Unit",
    flex: 1,
  },

  {
    field: "status",
    headerName: "Status",
    flex: 1,
  }

];

const rowData = [];

const gridOptions = {

  columnDefs,
  rowData,

  rowSelection: "multiple",

  pagination: true,

  animateRows: true,

  defaultColDef: {
    resizable: true,
    sortable: true,
    filter: true,
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

    <select class="source-column">

      <option value="Market Name cleaned">
        Market Name cleaned
      </option>

      <option value="Unit (Source)">
        Unit (Source)
      </option>

      <option value="Packaging">
        Packaging
      </option>

    </select>

    <span>→</span>

    <select class="target-column">

      <option value="product_name">
        product_name
      </option>

      <option value="unit">
        unit
      </option>

      <option value="volumes">
        volumes
      </option>

    </select>

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

async function loadColumns(file, type) {

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
// FILE UPLOAD EVENTS
// ====================================

document
  .getElementById("fileA")
  .addEventListener(
    "change",
    async (e) => {

      const file = e.target.files[0];

      const columns =
        await loadColumns(file, "A");

      console.log("DF_A columns:", columns);

      populateSourceColumns(columns);

    }
  );

document
  .getElementById("fileB")
  .addEventListener(
    "change",
    async (e) => {

      const file = e.target.files[0];

      const columns =
        await loadColumns(file, "B");

      console.log("DF_B columns:", columns);

      populateTargetColumns(columns);

    }
  );

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
// RUN MAPPING
// ====================================

async function runMapping() {

  try {

    // ================================
    // VALIDATE WEIGHTS
    // ================================

    if (!validateWeights()) {
      return;
    }

    // ================================
    // GET FILES
    // ================================

    const fileA =
      document.getElementById("fileA").files[0];

    const fileB =
      document.getElementById("fileB").files[0];

    if (!fileA || !fileB) {

      alert("Please upload both files");

      return;

    }

    // ================================
    // BUTTON LOADING
    // ================================

    const runButton =
      document.querySelector(".primary-btn");

    runButton.disabled = true;

    runButton.innerText = "Running Mapping...";

    // ================================
    // FORM DATA
    // ================================

    const formData = new FormData();

    formData.append("file_a", fileA);

    formData.append("file_b", fileB);

    // ================================
    // API CALL
    // ================================

    const response = await fetch("/map", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {

      throw new Error("API Error");

    }

    const data =
      await response.json();

    // ================================
    // UPDATE GRID
    // ================================

    gridApi.setGridOption("rowData", data);

    // ================================
    // UPDATE SUMMARY
    // ================================

    updateSummary(data);

    // ================================
    // RESET BUTTON
    // ================================

    runButton.disabled = false;

    runButton.innerText = "Run Mapping";

  } catch (error) {

    console.error(error);

    alert("Error running mapping");

    const runButton =
      document.querySelector(".primary-btn");

    runButton.disabled = false;

    runButton.innerText = "Run Mapping";

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
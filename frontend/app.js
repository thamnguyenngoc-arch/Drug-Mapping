// =========================
// app.js - Product Mapping Tool
// =========================

var API_URL = window.location.origin;

// =========================
// DOM ELEMENTS
// =========================

var fileAInput = document.getElementById("fileA");
var fileBInput = document.getElementById("fileB");
var fileAStatus = document.getElementById("fileAStatus");
var fileBStatus = document.getElementById("fileBStatus");

var sourceColumnsDiv = document.getElementById("sourceColumns");
var targetColumnsDiv = document.getElementById("targetColumns");

var mappingContainer = document.getElementById("mappingContainer");
var addMappingBtn = document.getElementById("addMapping");
var runMappingBtn = document.getElementById("runMapping");
var exportExcelBtn = document.getElementById("exportExcel");

var weightTotalText = document.getElementById("weightTotal");
var weightWarning = document.getElementById("weightWarning");
var statusText = document.getElementById("statusText");
var thresholdInput = document.getElementById("threshold");

var fileProgress = document.getElementById("fileProgress");
var fileProgressBar = document.getElementById("fileProgressBar");
var fileProgressText = document.getElementById("fileProgressText");

var mappingProgress = document.getElementById("mappingProgress");
var mappingProgressBar = document.getElementById("mappingProgressBar");
var mappingProgressText = document.getElementById("mappingProgressText");

// =========================
// GLOBAL DATA
// =========================

var sourceColumns = [];
var targetColumns = [];
var latestResult = [];

// =========================
// AG GRID INIT (v30 API)
// =========================

var gridOptions = {
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

var gridDiv = document.getElementById("mappingGrid");
new agGrid.Grid(gridDiv, gridOptions);

// =========================
// PROGRESS BAR HELPERS
// =========================

function showFileProgress(text) {
    fileProgress.style.display = "block";
    fileProgressBar.className = "progress-bar indeterminate";
    fileProgressText.textContent = text || "Loading...";
}

function hideFileProgress() {
    fileProgress.style.display = "none";
    fileProgressBar.className = "progress-bar";
}

function showMappingProgress(percent, text) {
    mappingProgress.style.display = "block";
    mappingProgressBar.className = "progress-bar";
    mappingProgressBar.style.width = percent + "%";
    mappingProgressText.textContent = text || (percent + "%");
}

function hideMappingProgress() {
    mappingProgress.style.display = "none";
    mappingProgressBar.style.width = "0%";
}

// =========================
// LOAD FILE COLUMNS
// =========================

function loadColumns(file) {
    var formData = new FormData();
    formData.append("file", file);

    return fetch(API_URL + "/columns", {
        method: "POST",
        body: formData
    })
    .then(function(response) { return response.json(); })
    .then(function(data) { return data.columns; });
}

// =========================
// POPULATE EXPORT CHECKBOXES
// =========================

function populateCheckboxes(container, columns, className) {
    container.innerHTML = "";
    for (var i = 0; i < columns.length; i++) {
        var col = columns[i];
        var label = document.createElement("label");
        label.className = "checkbox-item";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = className;
        cb.value = col;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(" " + col));
        container.appendChild(label);
    }
}

// =========================
// FILE A UPLOAD
// =========================

fileAInput.addEventListener("change", function(e) {
    var file = e.target.files[0];
    if (!file) return;

    showFileProgress("Loading source columns (df_a)...");
    fileAStatus.textContent = "";
    statusText.innerText = "Loading source columns...";

    loadColumns(file)
        .then(function(cols) {
            sourceColumns = cols;
            populateCheckboxes(sourceColumnsDiv, sourceColumns, "source-export");
            fileAStatus.textContent = "Loaded " + sourceColumns.length + " columns";
            statusText.innerText = "Source file loaded successfully";
            if (document.querySelectorAll(".mapping-row").length === 0 && targetColumns.length > 0) {
                addMappingRow();
            }
            refreshMappingDropdowns();
            hideFileProgress();
        })
        .catch(function(err) {
            console.error(err);
            fileAStatus.textContent = "Error loading file";
            statusText.innerText = "Failed to load source file";
            hideFileProgress();
        });
});

// =========================
// FILE B UPLOAD
// =========================

fileBInput.addEventListener("change", function(e) {
    var file = e.target.files[0];
    if (!file) return;

    showFileProgress("Loading target columns (df_b)...");
    fileBStatus.textContent = "";
    statusText.innerText = "Loading target columns...";

    loadColumns(file)
        .then(function(cols) {
            targetColumns = cols;
            populateCheckboxes(targetColumnsDiv, targetColumns, "target-export");
            fileBStatus.textContent = "Loaded " + targetColumns.length + " columns";
            statusText.innerText = "Target file loaded successfully";
            if (document.querySelectorAll(".mapping-row").length === 0 && sourceColumns.length > 0) {
                addMappingRow();
            }
            refreshMappingDropdowns();
            hideFileProgress();
        })
        .catch(function(err) {
            console.error(err);
            fileBStatus.textContent = "Error loading file";
            statusText.innerText = "Failed to load target file";
            hideFileProgress();
        });
});

// =========================
// CREATE SELECT OPTIONS
// =========================

function createOptions(columns, selectedValue) {
    var html = "";
    for (var i = 0; i < columns.length; i++) {
        var col = columns[i];
        var sel = (col === selectedValue) ? " selected" : "";
        html += "<option value=\"" + col + "\"" + sel + ">" + col + "</option>";
    }
    return html;
}

// =========================
// REFRESH MAPPING DROPDOWNS
// =========================

function refreshMappingDropdowns() {
    var rows = document.querySelectorAll(".mapping-row");
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var ss = row.querySelector(".source-select");
        var ts = row.querySelector(".target-select");
        if (ss) {
            var sv = ss.value;
            ss.innerHTML = createOptions(sourceColumns, sv);
        }
        if (ts) {
            var tv = ts.value;
            ts.innerHTML = createOptions(targetColumns, tv);
        }
    }
}

// =========================
// ADD MAPPING ROW
// =========================

function addMappingRow() {
    if (sourceColumns.length === 0 || targetColumns.length === 0) {
        alert("Please upload both files first to load columns.");
        return;
    }

    var row = document.createElement("div");
    row.className = "mapping-row";

    var html = "";
    html += "<label>comp_table</label>";
    html += "<select class=\"source-select\">" + createOptions(sourceColumns) + "</select>";
    html += "<span class=\"arrow\">&#8594;</span>";
    html += "<label>target</label>";
    html += "<select class=\"target-select\">" + createOptions(targetColumns) + "</select>";
    html += "<label>weight</label>";
    html += "<input type=\"number\" class=\"weight-input\" value=\"0.5\" min=\"0\" max=\"1\" step=\"0.01\" />";
    html += "<button type=\"button\" class=\"remove-btn danger\">Remove</button>";
    row.innerHTML = html;

    mappingContainer.appendChild(row);

    row.querySelector(".remove-btn").addEventListener("click", function() {
        row.remove();
        updateWeightTotal();
    });

    row.querySelector(".weight-input").addEventListener("input", updateWeightTotal);

    updateWeightTotal();
}

// =========================
// UPDATE WEIGHT TOTAL
// =========================

function updateWeightTotal() {
    var weightInputs = document.querySelectorAll(".weight-input");
    var total = 0;
    for (var i = 0; i < weightInputs.length; i++) {
        total += parseFloat(weightInputs[i].value || 0);
    }
    total = Number(total.toFixed(4));
    weightTotalText.innerText = total;

    if (weightInputs.length === 0) {
        weightWarning.innerText = "";
        weightWarning.className = "";
    } else if (total !== 1) {
        weightWarning.innerText = "Total weight must equal 1.0";
        weightWarning.className = "weight-warning";
    } else {
        weightWarning.innerText = "Weight OK";
        weightWarning.className = "weight-ok";
    }
}

// =========================
// ADD MAPPING BUTTON
// =========================

addMappingBtn.addEventListener("click", function() {
    addMappingRow();
});

// =========================
// GET MAPPING CONFIG
// =========================

function getMappingConfig() {
    var rows = document.querySelectorAll(".mapping-row");
    var config = [];
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        config.push({
            source: row.querySelector(".source-select").value,
            target: row.querySelector(".target-select").value,
            weight: parseFloat(row.querySelector(".weight-input").value)
        });
    }
    return config;
}

// =========================
// GET EXPORT COLUMNS
// =========================

function getExportColumns() {
    var srcChecked = document.querySelectorAll(".source-export:checked");
    var tgtChecked = document.querySelectorAll(".target-export:checked");
    var srcArr = [];
    for (var i = 0; i < srcChecked.length; i++) { srcArr.push(srcChecked[i].value); }
    var tgtArr = [];
    for (var j = 0; j < tgtChecked.length; j++) { tgtArr.push(tgtChecked[j].value); }
    return { source: srcArr, target: tgtArr };
}

// =========================
// DISPLAY RESULTS IN GRID
// =========================

function displayResults(data) {
    latestResult = data;
    if (!data || !data.length) {
        alert("No result returned");
        return;
    }

    var keys = Object.keys(data[0]);
    var columnDefs = [];
    var thresholdVal = parseFloat(thresholdInput.value);

    for (var i = 0; i < keys.length; i++) {
        var col = keys[i];
        var def = { field: col, headerName: col };

        if (col === "score") {
            def.sort = "desc";
            def.valueGetter = function(params) {
                return parseFloat(params.data.score);
            };
            def.cellStyle = (function(tv) {
                return function(params) {
                    var val = parseFloat(params.value);
                    if (val >= tv) {
                        return { backgroundColor: "#dcfce7", fontWeight: "bold" };
                    }
                    return { backgroundColor: "#fee2e2" };
                };
            })(thresholdVal);
        }

        if (col === "predict") {
            def.cellStyle = function(params) {
                if (params.value === "Match") {
                    return { color: "#16a34a", fontWeight: "bold" };
                }
                return { color: "#dc2626", fontWeight: "bold" };
            };
        }

        columnDefs.push(def);
    }

    gridOptions.api.setColumnDefs(columnDefs);
    gridOptions.api.setRowData(data);
    statusText.innerText = "Mapping complete: " + data.length + " rows";
}

// =========================
// PARSE SSE STREAM
// =========================

function parseSSEStream(reader) {
    var decoder = new TextDecoder();
    var buffer = "";
    var resultData = null;

    function processChunk(result) {
        if (result.done) {
            return resultData;
        }

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop();

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf("data: ") === 0) {
                var jsonStr = line.substring(6);
                try {
                    var evt = JSON.parse(jsonStr);
                    if (evt.type === "progress") {
                        var pct = Math.round((evt.current / evt.total) * 100);
                        showMappingProgress(pct, evt.current + " / " + evt.total + " rows (" + pct + "%)");
                    } else if (evt.type === "complete") {
                        resultData = evt.data;
                    } else if (evt.type === "error") {
                        throw new Error(evt.message);
                    }
                } catch (parseErr) {
                    if (parseErr.message && parseErr.message.indexOf("JSON") === -1) {
                        throw parseErr;
                    }
                }
            }
        }

        return reader.read().then(processChunk);
    }

    return reader.read().then(processChunk);
}

// =========================
// RUN MAPPING
// =========================

runMappingBtn.addEventListener("click", function() {
    if (!fileAInput.files[0] || !fileBInput.files[0]) {
        alert("Please upload both files");
        return;
    }

    var mappingConfig = getMappingConfig();
    if (mappingConfig.length === 0) {
        alert("Please add at least one mapping pair");
        return;
    }

    var totalWeight = parseFloat(weightTotalText.innerText);
    if (Math.abs(totalWeight - 1) > 0.001) {
        alert("Total weight must equal 1.0");
        return;
    }

    var exportColumns = getExportColumns();
    var threshold = parseFloat(thresholdInput.value);

    var formData = new FormData();
    formData.append("file_a", fileAInput.files[0]);
    formData.append("file_b", fileBInput.files[0]);
    formData.append("mapping_config", JSON.stringify(mappingConfig));
    formData.append("export_columns", JSON.stringify(exportColumns));
    formData.append("threshold", threshold);

    statusText.innerText = "Running mapping...";
    runMappingBtn.disabled = true;
    showMappingProgress(0, "Starting mapping...");

    fetch(API_URL + "/map_stream", {
        method: "POST",
        body: formData
    })
    .then(function(response) {
        var ct = response.headers.get("content-type") || "";
        if (response.ok && ct.indexOf("text/event-stream") !== -1) {
            return parseSSEStream(response.body.getReader());
        } else {
            var fd2 = new FormData();
            fd2.append("file_a", fileAInput.files[0]);
            fd2.append("file_b", fileBInput.files[0]);
            fd2.append("mapping_config", JSON.stringify(mappingConfig));
            fd2.append("export_columns", JSON.stringify(exportColumns));
            fd2.append("threshold", threshold);
            showMappingProgress(50, "Processing...");
            return fetch(API_URL + "/map", { method: "POST", body: fd2 })
                .then(function(r) { return r.json(); })
                .then(function(d) {
                    if (d.error) { throw new Error(d.error); }
                    return d;
                });
        }
    })
    .then(function(data) {
        if (data) { displayResults(data); }
        else { alert("No result returned"); }
    })
    .catch(function(error) {
        console.error(error);
        alert("Mapping failed: " + error.message);
    })
    .then(function() {
        runMappingBtn.disabled = false;
        hideMappingProgress();
    });
});

// =========================
// EXPORT XLSX (using SheetJS)
// =========================

exportExcelBtn.addEventListener("click", function() {
    if (!latestResult || !latestResult.length) {
        alert("No mapping result to export. Run mapping first.");
        return;
    }

    var ws = XLSX.utils.json_to_sheet(latestResult);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mapping Result");

    var keys = Object.keys(latestResult[0]);
    var colWidths = [];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var maxLen = key.length;
        var limit = Math.min(latestResult.length, 100);
        for (var j = 0; j < limit; j++) {
            var cellLen = String(latestResult[j][key] || "").length;
            if (cellLen > maxLen) { maxLen = cellLen; }
        }
        colWidths.push({ wch: Math.min(maxLen + 2, 50) });
    }
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, "mapping_result.xlsx");
    statusText.innerText = "Exported mapping_result.xlsx";
});
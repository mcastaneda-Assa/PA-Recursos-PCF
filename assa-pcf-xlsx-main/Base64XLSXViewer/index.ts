import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as XLSX from "xlsx";

const ICONS = {
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    fullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><polyline points="21 3 14 10"/><polyline points="3 21 10 14"/></svg>',
    emptyDoc: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    excel: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
};

interface SheetData {
    name: string;
    headers: string[];
    rows: string[][];
    totalRows: number;
    totalCols: number;
}

export class Base64XLSXViewer implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;
    private _lastBase64: string = "";
    private _lastFileName: string = "";

    // Data
    private _sheets: SheetData[] = [];
    private _activeSheetIndex: number = 0;

    // DOM
    private _mainContainer: HTMLDivElement;
    private _toolbar: HTMLDivElement;
    private _sheetTabsBar: HTMLDivElement;
    private _viewerWrapper: HTMLDivElement;
    private _tableContainer: HTMLDivElement;
    private _sheetInfoBar: HTMLDivElement;
    private _fileNameSpan: HTMLSpanElement;
    private _searchInput: HTMLInputElement;
    private _searchWrapper: HTMLDivElement;

    // Blob for download
    private _blobUrl: string = "";

    constructor() {
        // empty
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._context = context;
        this._container = container;
        context.mode.trackContainerResize(true);
        this._buildUI();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        const base64 = context.parameters.base64Content?.raw || "";
        const fileName = context.parameters.fileName?.raw || "documento.xlsx";

        if (fileName !== this._lastFileName) {
            this._lastFileName = fileName;
            if (this._fileNameSpan) {
                this._fileNameSpan.textContent = fileName;
                this._fileNameSpan.title = fileName;
            }
        }

        if (base64 && base64 !== this._lastBase64) {
            this._lastBase64 = base64;
            this._loadXLSX(base64);
        } else if (!base64 && this._lastBase64) {
            this._lastBase64 = "";
            this._sheets = [];
            this._activeSheetIndex = 0;
            this._showEmptyState();
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this._revokeBlob();
    }

    // ========== UI ==========

    private _buildUI(): void {
        this._mainContainer = document.createElement("div");
        this._mainContainer.className = "xlsx-viewer-container";

        // Toolbar
        this._toolbar = this._buildToolbar();
        this._mainContainer.appendChild(this._toolbar);

        // Sheet tabs bar
        this._sheetTabsBar = document.createElement("div");
        this._sheetTabsBar.className = "xlsx-sheet-tabs";
        this._sheetTabsBar.style.display = "none";
        this._mainContainer.appendChild(this._sheetTabsBar);

        // Viewer wrapper
        this._viewerWrapper = document.createElement("div");
        this._viewerWrapper.className = "xlsx-viewer-wrapper";

        // Sheet info bar
        this._sheetInfoBar = document.createElement("div");
        this._sheetInfoBar.className = "xlsx-sheet-info";
        this._sheetInfoBar.style.display = "none";
        this._viewerWrapper.appendChild(this._sheetInfoBar);

        // Table container
        this._tableContainer = document.createElement("div");
        this._tableContainer.className = "xlsx-table-container";
        this._viewerWrapper.appendChild(this._tableContainer);

        this._mainContainer.appendChild(this._viewerWrapper);
        this._container.appendChild(this._mainContainer);

        this._showEmptyState();
    }

    private _buildToolbar(): HTMLDivElement {
        const toolbar = document.createElement("div");
        toolbar.className = "xlsx-toolbar";

        // Left: file name
        const leftGroup = document.createElement("div");
        leftGroup.className = "xlsx-toolbar-group";

        const xlsxIcon = document.createElement("span");
        xlsxIcon.className = "xlsx-icon";
        xlsxIcon.innerHTML = ICONS.excel;
        leftGroup.appendChild(xlsxIcon);

        this._fileNameSpan = document.createElement("span");
        this._fileNameSpan.className = "xlsx-file-name";
        this._fileNameSpan.textContent = "documento.xlsx";
        leftGroup.appendChild(this._fileNameSpan);

        toolbar.appendChild(leftGroup);

        // Right: actions
        const rightGroup = document.createElement("div");
        rightGroup.className = "xlsx-toolbar-group";

        // Search
        this._searchWrapper = document.createElement("div");
        this._searchWrapper.className = "xlsx-toolbar-group";
        this._searchWrapper.style.position = "relative";

        this._searchInput = document.createElement("input");
        this._searchInput.type = "text";
        this._searchInput.placeholder = "Buscar...";
        this._searchInput.style.cssText = "background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:6px;padding:5px 10px;font-size:12px;width:140px;outline:none;height:34px;box-sizing:border-box;";
        this._searchInput.addEventListener("input", () => this._onSearch());
        this._searchWrapper.appendChild(this._searchInput);
        rightGroup.appendChild(this._searchWrapper);

        // Download
        const downloadBtn = this._createButton(ICONS.download, "Descargar Excel", () => this._downloadXLSX());
        rightGroup.appendChild(downloadBtn);

        // Fullscreen
        const fullscreenBtn = this._createButton(ICONS.fullscreen, "Pantalla completa", () => this._toggleFullscreen());
        rightGroup.appendChild(fullscreenBtn);

        toolbar.appendChild(rightGroup);

        return toolbar;
    }

    private _createButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.innerHTML = icon;
        btn.title = title;
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    // ========== XLSX LOADING ==========

    private _loadXLSX(base64: string): void {
        try {
            // Clean base64
            let cleanBase64 = base64.trim();
            if (cleanBase64.includes(",")) {
                cleanBase64 = cleanBase64.split(",")[1];
            }
            cleanBase64 = cleanBase64.replace(/\s/g, "");

            // Decode to binary
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Create blob for download
            this._revokeBlob();
            const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            this._blobUrl = URL.createObjectURL(blob);

            // Parse with SheetJS
            const workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellStyles: true });

            // Extract all sheets
            this._sheets = [];
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: "",
                    raw: false,
                });

                if (jsonData.length === 0) {
                    this._sheets.push({
                        name: sheetName,
                        headers: [],
                        rows: [],
                        totalRows: 0,
                        totalCols: 0,
                    });
                    continue;
                }

                // Determine max columns
                let maxCols = 0;
                for (const row of jsonData) {
                    if (row.length > maxCols) maxCols = row.length;
                }

                // Generate column headers (A, B, C, ..., AA, AB, ...)
                const headers: string[] = [];
                for (let c = 0; c < maxCols; c++) {
                    headers.push(this._colName(c));
                }

                // Normalize rows
                const rows: string[][] = jsonData.map((row: any[]) => {
                    const normalized: string[] = [];
                    for (let c = 0; c < maxCols; c++) {
                        const val = c < row.length ? row[c] : "";
                        normalized.push(val != null ? String(val) : "");
                    }
                    return normalized;
                });

                this._sheets.push({
                    name: sheetName,
                    headers,
                    rows,
                    totalRows: rows.length,
                    totalCols: maxCols,
                });
            }

            // Render
            this._activeSheetIndex = 0;
            this._renderSheetTabs();
            this._renderActiveSheet();

        } catch (error: any) {
            console.error("XLSX Load Error:", error);
            this._showError(`Error al cargar el Excel: ${error.message || "formato inválido"}`);
        }
    }

    // ========== RENDERING ==========

    private _renderSheetTabs(): void {
        this._sheetTabsBar.innerHTML = "";

        if (this._sheets.length <= 1) {
            this._sheetTabsBar.style.display = this._sheets.length === 1 ? "flex" : "none";
        } else {
            this._sheetTabsBar.style.display = "flex";
        }

        this._sheets.forEach((sheet, index) => {
            const tab = document.createElement("button");
            tab.className = `xlsx-sheet-tab${index === this._activeSheetIndex ? " active" : ""}`;
            tab.textContent = sheet.name;
            tab.title = `${sheet.name} (${sheet.totalRows} filas × ${sheet.totalCols} columnas)`;
            tab.addEventListener("click", () => {
                this._activeSheetIndex = index;
                this._searchInput.value = "";
                this._renderSheetTabs();
                this._renderActiveSheet();
            });
            this._sheetTabsBar.appendChild(tab);
        });
    }

    private _renderActiveSheet(): void {
        const sheet = this._sheets[this._activeSheetIndex];
        if (!sheet) {
            this._showEmptyState();
            return;
        }

        this._toolbar.style.display = "flex";
        this._viewerWrapper.style.background = "#ffffff";

        // Sheet info bar
        this._sheetInfoBar.style.display = "flex";
        this._sheetInfoBar.textContent = `${sheet.name}  —  ${sheet.totalRows} filas × ${sheet.totalCols} columnas`;

        // Build table
        this._renderTable(sheet.headers, sheet.rows);
    }

    private _renderTable(headers: string[], rows: string[][], highlight?: string): void {
        this._tableContainer.innerHTML = "";

        if (headers.length === 0 && rows.length === 0) {
            const emptySheet = document.createElement("div");
            emptySheet.style.cssText = "display:flex;align-items:center;justify-content:center;height:200px;color:#999;font-size:14px;";
            emptySheet.textContent = "Hoja vacía";
            this._tableContainer.appendChild(emptySheet);
            return;
        }

        const table = document.createElement("table");

        // Header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        // Row number header
        const rowNumTh = document.createElement("th");
        rowNumTh.className = "xlsx-row-num";
        rowNumTh.textContent = "";
        headerRow.appendChild(rowNumTh);

        headers.forEach((h) => {
            const th = document.createElement("th");
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement("tbody");
        const lowerHighlight = highlight ? highlight.toLowerCase() : "";

        rows.forEach((row, rowIndex) => {
            // If searching, filter rows
            if (lowerHighlight) {
                const matches = row.some((cell) => cell.toLowerCase().includes(lowerHighlight));
                if (!matches) return;
            }

            const tr = document.createElement("tr");

            // Row number
            const rowNumTd = document.createElement("td");
            rowNumTd.className = "xlsx-row-num";
            rowNumTd.textContent = String(rowIndex + 1);
            tr.appendChild(rowNumTd);

            row.forEach((cell) => {
                const td = document.createElement("td");
                if (lowerHighlight && cell.toLowerCase().includes(lowerHighlight)) {
                    td.innerHTML = this._highlightText(cell, lowerHighlight);
                } else {
                    td.textContent = cell;
                }
                td.title = cell;
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        this._tableContainer.appendChild(table);
    }

    private _highlightText(text: string, search: string): string {
        const lowerText = text.toLowerCase();
        let result = "";
        let lastIndex = 0;
        let index = lowerText.indexOf(search, lastIndex);

        while (index !== -1) {
            result += this._escapeHtml(text.substring(lastIndex, index));
            result += `<mark style="background:#ffe082;padding:0 2px;border-radius:2px;">${this._escapeHtml(text.substring(index, index + search.length))}</mark>`;
            lastIndex = index + search.length;
            index = lowerText.indexOf(search, lastIndex);
        }

        result += this._escapeHtml(text.substring(lastIndex));
        return result;
    }

    private _escapeHtml(text: string): string {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== SEARCH ==========

    private _onSearch(): void {
        const query = this._searchInput.value.trim();
        const sheet = this._sheets[this._activeSheetIndex];
        if (!sheet) return;
        this._renderTable(sheet.headers, sheet.rows, query || undefined);
    }

    // ========== ACTIONS ==========

    private _downloadXLSX(): void {
        if (!this._blobUrl) return;
        const fileName = this._lastFileName || "documento.xlsx";
        const a = document.createElement("a");
        a.href = this._blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    private _toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            this._mainContainer.requestFullscreen?.().catch(() => { /* not supported */ });
        } else {
            document.exitFullscreen?.();
        }
    }

    // ========== HELPERS ==========

    private _colName(index: number): string {
        let name = "";
        let i = index;
        while (i >= 0) {
            name = String.fromCharCode(65 + (i % 26)) + name;
            i = Math.floor(i / 26) - 1;
        }
        return name;
    }

    // ========== UI STATES ==========

    private _showEmptyState(): void {
        this._sheetTabsBar.style.display = "none";
        this._sheetInfoBar.style.display = "none";
        this._tableContainer.innerHTML = "";
        this._viewerWrapper.style.background = "#1a1a2e";

        const empty = document.createElement("div");
        empty.className = "xlsx-empty-state";
        empty.innerHTML = `
            <div class="xlsx-empty-icon">${ICONS.emptyDoc}</div>
            <div class="xlsx-empty-text">No hay documento Excel para mostrar.<br/>Asigna un valor Base64 para visualizar el archivo.</div>
        `;
        this._tableContainer.appendChild(empty);
    }

    private _showError(message: string): void {
        this._sheetTabsBar.style.display = "none";
        this._sheetInfoBar.style.display = "none";
        this._tableContainer.innerHTML = "";
        this._viewerWrapper.style.background = "#1a1a2e";

        const error = document.createElement("div");
        error.className = "xlsx-error-state";
        error.innerHTML = `
            <div class="xlsx-error-icon">⚠️</div>
            <div class="xlsx-error-text">${message}</div>
        `;
        this._tableContainer.appendChild(error);
    }

    private _revokeBlob(): void {
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = "";
        }
    }
}

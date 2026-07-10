use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashSet, VecDeque},
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Deserialize, Serialize)]
struct AssetRecord {
    id: usize,
    name: String,
    path: String,
    file_type: String,
    extension: String,
    size_bytes: u64,
    modified_unix: Option<u64>,
    #[serde(default)]
    content_clues: Vec<String>,
    #[serde(default)]
    analysis_caption: String,
    #[serde(default)]
    analysis_error: String,
    #[serde(default)]
    analysis_file_signature: String,
    #[serde(default = "default_asset_analysis_status")]
    analysis_status: String,
    #[serde(default)]
    analysis_suggested_tags: Vec<String>,
    #[serde(default)]
    analysis_version: u32,
    #[serde(default)]
    kept_tags: Vec<String>,
    #[serde(default)]
    notes: String,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Debug, Serialize)]
struct ScanResult {
    root_path: String,
    assets: Vec<AssetRecord>,
    skipped_entries: usize,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SourceFolderState {
    id: String,
    path: String,
    name: String,
    asset_ids: Vec<usize>,
    skipped_entries: usize,
    enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryNodeRuleState {
    field: String,
    operator: String,
    value: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct VirtualFolderState {
    id: String,
    name: String,
    asset_ids: Vec<usize>,
    children: Vec<VirtualFolderState>,
    #[serde(default)]
    disk_path: Option<String>,
    #[serde(default)]
    is_planned_on_disk: bool,
    #[serde(default)]
    path_segment: String,
    #[serde(default)]
    rules: Vec<LibraryNodeRuleState>,
    #[serde(default)]
    suggested_tags: Vec<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    template_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryState {
    root_path: Option<String>,
    assets: Vec<AssetRecord>,
    #[serde(default)]
    source_folders: Vec<SourceFolderState>,
    #[serde(default)]
    project_tag_groups: Vec<ProjectTagGroupState>,
    #[serde(default)]
    recent_user_tag_ids: Vec<String>,
    virtual_folders: Vec<VirtualFolderState>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTagDefinitionState {
    id: String,
    label: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTagGroupState {
    id: String,
    label: String,
    #[serde(default)]
    tags: Vec<ProjectTagDefinitionState>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct ModelVector3State {
    x: f64,
    y: f64,
    z: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct ModelTransformState {
    position: ModelVector3State,
    rotation: ModelVector3State,
    scale: ModelVector3State,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryWorkspaceState {
    #[serde(default = "default_active_view")]
    active_view: String,
    #[serde(default = "default_left_pane_view")]
    left_pane_view: String,
    #[serde(default = "default_scene_mode")]
    scene_mode: String,
    #[serde(default)]
    selected_asset_id: Option<usize>,
    #[serde(default)]
    selected_folder_id: Option<String>,
    #[serde(default = "default_tree_open_node_ids")]
    tree_open_node_ids: Vec<String>,
    #[serde(default = "default_asset_sort_key")]
    asset_sort_key: String,
    #[serde(default = "default_asset_sort_direction")]
    asset_sort_direction: String,
    #[serde(default = "default_asset_view_mode")]
    asset_view_mode: String,
    #[serde(default = "default_details_column_widths")]
    details_column_widths: serde_json::Value,
    #[serde(default)]
    asset_search_query: String,
    #[serde(default)]
    active_nvd_document_path: Option<String>,
    #[serde(default)]
    model_transform_overrides: BTreeMap<String, ModelTransformState>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryIdentityState {
    name: String,
    created_at_unix: u64,
    updated_at_unix: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryDocumentEntry {
    id: String,
    #[serde(default)]
    asset_id: usize,
    kind: String,
    title: String,
    path: String,
    created_at_unix: u64,
    updated_at_unix: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryDocumentsState {
    #[serde(default)]
    nvd_documents: Vec<InventoryDocumentEntry>,
    #[serde(default)]
    nvv_documents: Vec<InventoryDocumentEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryExportSettings {
    #[serde(default = "default_export_conflict_strategy")]
    conflict_strategy: String,
    #[serde(default)]
    preserve_empty_folders: bool,
    #[serde(default)]
    last_export_root: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryManifest {
    schema_version: u32,
    kind: String,
    #[serde(default = "default_inventory_readme")]
    readme: String,
    inventory: InventoryIdentityState,
    #[serde(default)]
    root_path: Option<String>,
    #[serde(default)]
    source_folders: Vec<SourceFolderState>,
    #[serde(default)]
    assets: Vec<AssetRecord>,
    #[serde(default)]
    library_tree: Vec<VirtualFolderState>,
    #[serde(default)]
    project_tag_groups: Vec<ProjectTagGroupState>,
    #[serde(default)]
    recent_user_tag_ids: Vec<String>,
    #[serde(default = "default_inventory_workspace_state")]
    workspace_state: InventoryWorkspaceState,
    #[serde(default = "default_inventory_documents_state")]
    documents: InventoryDocumentsState,
    #[serde(default = "default_inventory_export_settings")]
    export_settings: InventoryExportSettings,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InventoryManifestWire {
    schema_version: u32,
    kind: String,
    #[serde(default)]
    readme: Option<String>,
    #[serde(default)]
    inventory: Option<InventoryIdentityState>,
    #[serde(default)]
    inventory_name: Option<String>,
    #[serde(default)]
    created_at_unix: Option<u64>,
    #[serde(default)]
    updated_at_unix: Option<u64>,
    #[serde(default)]
    root_path: Option<String>,
    #[serde(default)]
    source_folders: Option<Vec<SourceFolderState>>,
    #[serde(default)]
    assets: Option<Vec<AssetRecord>>,
    #[serde(default)]
    library_tree: Option<Vec<VirtualFolderState>>,
    #[serde(default)]
    project_tag_groups: Option<Vec<ProjectTagGroupState>>,
    #[serde(default)]
    recent_user_tag_ids: Option<Vec<String>>,
    #[serde(default)]
    library_state: Option<LibraryState>,
    #[serde(default)]
    workspace_state: Option<InventoryWorkspaceState>,
    #[serde(default)]
    documents: Option<InventoryDocumentsState>,
    #[serde(default)]
    export_settings: Option<InventoryExportSettings>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedInventory {
    manifest_path: String,
    root_path: String,
    manifest: InventoryManifest,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdBlock {
    id: String,
    kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    keep_lines_together: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    keep_with_next: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    line_height: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    orphan_line_count: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    space_after_pt: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    space_before_pt: Option<f64>,
    #[serde(default)]
    text: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    runs: Vec<NvdTextRun>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    text_align: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    embed: Option<NvdAssetEmbed>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    widow_line_count: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdAssetEmbed {
    asset_id: usize,
    asset_kind: String,
    asset_name: String,
    asset_path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    alignment: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    caption: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    display_mode: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    height_px: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    source_document_kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    width_px: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdPageObjectAsset {
    asset_id: usize,
    asset_kind: String,
    asset_name: String,
    asset_path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    source_document_kind: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdPageObject {
    id: String,
    kind: String,
    #[serde(default)]
    page_index: usize,
    #[serde(default)]
    x_px: f64,
    #[serde(default)]
    y_px: f64,
    #[serde(default = "default_nvd_page_object_extent_px")]
    width_px: f64,
    #[serde(default = "default_nvd_page_object_extent_px")]
    height_px: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    rotation_deg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    wrap_mode: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    z_mode: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    wrap_padding_px: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    asset: Option<NvdPageObjectAsset>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdTextRun {
    text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    style: Option<NvdTextStyle>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdTextStyle {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    bold: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    character_spacing_pt: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    font_family: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    font_size: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    italic: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdPageLayout {
    page_size: String,
    width_pt: f64,
    height_pt: f64,
    margin_top_pt: f64,
    margin_right_pt: f64,
    margin_bottom_pt: f64,
    margin_left_pt: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdStyleDefinition {
    bold: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    character_spacing_pt: Option<f64>,
    font_family: String,
    font_size_pt: f64,
    italic: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    keep_lines_together: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    keep_with_next: Option<bool>,
    label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    line_height: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    orphan_line_count: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    space_after_pt: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    space_before_pt: Option<f64>,
    role: String,
    text_align: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    widow_line_count: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvdDocument {
    schema_version: u32,
    kind: String,
    title: String,
    created_at_unix: u64,
    updated_at_unix: u64,
    #[serde(default = "default_nvd_font_family")]
    font_family: String,
    #[serde(default = "default_nvd_font_size")]
    font_size: String,
    #[serde(default = "default_nvd_layout_mode")]
    layout_mode: String,
    #[serde(default = "default_nvd_page_layout")]
    page_layout: NvdPageLayout,
    blocks: Vec<NvdBlock>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    page_objects: Vec<NvdPageObject>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    styles: BTreeMap<String, NvdStyleDefinition>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedNvdDocument {
    path: String,
    document: NvdDocument,
    entry: InventoryDocumentEntry,
    asset: AssetRecord,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvvDocument {
    schema_version: u32,
    kind: String,
    title: String,
    created_at_unix: u64,
    updated_at_unix: u64,
    canvas_width: f64,
    canvas_height: f64,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    paths: Vec<NvvPath>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvvPath {
    id: String,
    anchors: Vec<NvvAnchorPoint>,
    #[serde(default)]
    closed: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    closed_to_anchor_index: Option<usize>,
    stroke: String,
    stroke_width: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvvAnchorPoint {
    x: f64,
    y: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    handle_mode: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    handle_in: Option<NvvPoint>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    handle_out: Option<NvvPoint>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NvvPoint {
    x: f64,
    y: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedNvvDocument {
    path: String,
    document: NvvDocument,
    entry: InventoryDocumentEntry,
    asset: AssetRecord,
}

const MAX_PREVIEW_BYTES: u64 = 200 * 1024 * 1024;
const NVD_DEFAULT_EMBED_ALIGNMENT: &str = "center";
const NVD_DEFAULT_EMBED_DISPLAY_MODE: &str = "fit";
const INVENTORY_SCHEMA_VERSION: u32 = 2;
const INVENTORY_MANIFEST_KIND: &str = "inventory.project";
const INVENTORY_MANIFEST_FILENAME: &str = "Invent.nvi";
const NVD_SCHEMA_VERSION: u32 = 2;
const NVD_DOCUMENT_KIND: &str = "inventory.document";
const NVV_SCHEMA_VERSION: u32 = 1;
const NVV_DOCUMENT_KIND: &str = "inventory.vector";
const NVD_DEFAULT_FONT_FAMILY: &str = "Inter";
const NVD_DEFAULT_FONT_SIZE: &str = "12pt";
const NVD_MIN_FONT_SIZE_PT: f64 = 6.0;
const NVD_MAX_FONT_SIZE_PT: f64 = 144.0;
const NVD_LAYOUT_MODE_A4: &str = "a4";
const NVD_PAGE_SIZE_A4: &str = "a4";
const NVD_PAGE_SIZE_CUSTOM: &str = "custom";
const NVD_PT_PER_INCH: f64 = 72.0;
const NVD_MM_PER_INCH: f64 = 25.4;
const NVD_A4_PAGE_WIDTH_PT: f64 = (210.0 / NVD_MM_PER_INCH) * NVD_PT_PER_INCH;
const NVD_A4_PAGE_HEIGHT_PT: f64 = (297.0 / NVD_MM_PER_INCH) * NVD_PT_PER_INCH;
const NVD_DEFAULT_PAGE_MARGIN_PT: f64 = 72.0;
const NVD_MIN_PAGE_CONTENT_SIZE_PT: f64 = 36.0;
const MAX_CONTENT_CLUE_BYTES: usize = 16 * 1024;
const MAX_CONTENT_CLUES: usize = 48;

#[tauri::command]
fn scan_folder(path: String) -> Result<ScanResult, String> {
    let root = PathBuf::from(&path);

    if !root.exists() {
        return Err("Folder does not exist.".to_string());
    }

    if !root.is_dir() {
        return Err("Selected path is not a folder.".to_string());
    }

    let mut assets = Vec::new();
    let mut skipped_entries = 0usize;
    let mut queue = VecDeque::from([root.clone()]);

    while let Some(folder) = queue.pop_front() {
        let entries = match fs::read_dir(&folder) {
            Ok(entries) => entries,
            Err(_) => {
                skipped_entries += 1;
                continue;
            }
        };

        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => {
                    skipped_entries += 1;
                    continue;
                }
            };

            let entry_path = entry.path();
            let metadata = match entry.metadata() {
                Ok(metadata) => metadata,
                Err(_) => {
                    skipped_entries += 1;
                    continue;
                }
            };

            if metadata.is_dir() {
                if !is_symlink_dir(&entry_path) {
                    queue.push_back(entry_path);
                }
                continue;
            }

            if !metadata.is_file() {
                continue;
            }

            let extension = match entry_path.extension().and_then(|value| value.to_str()) {
                Some(extension) => extension.to_lowercase(),
                None => continue,
            };

            let Some(file_type) = supported_file_type(&extension) else {
                continue;
            };
            let content_clues = infer_content_clues(&entry_path, &extension);

            let name = entry_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("Untitled")
                .to_string();

            let modified_unix = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                .map(|value| value.as_secs());

            let path = entry_path.to_string_lossy().to_string();

            assets.push(AssetRecord {
                id: stable_asset_id(&path),
                name,
                path,
                file_type: file_type.to_string(),
                extension,
                size_bytes: metadata.len(),
                modified_unix,
                content_clues,
                analysis_caption: String::new(),
                analysis_error: String::new(),
                analysis_file_signature: String::new(),
                analysis_status: default_asset_analysis_status(),
                analysis_suggested_tags: Vec::new(),
                analysis_version: 0,
                notes: String::new(),
                kept_tags: Vec::new(),
                tags: Vec::new(),
            });
        }
    }

    assets.sort_by(|a, b| {
        a.file_type
            .cmp(&b.file_type)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(ScanResult {
        root_path: root.to_string_lossy().to_string(),
        assets,
        skipped_entries,
    })
}

#[tauri::command]
fn load_library_state(app: AppHandle) -> Result<LibraryState, String> {
    let conn = open_database(&app)?;
    init_schema(&conn)?;

    let root_path = conn
        .query_row(
            "SELECT value FROM app_state WHERE key = 'root_path'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let source_folders = conn
        .query_row(
            "SELECT value FROM app_state WHERE key = 'source_folders'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .map(|value| serde_json::from_str::<Vec<SourceFolderState>>(&value))
        .transpose()
        .map_err(|error| error.to_string())?
        .unwrap_or_default();

    let mut assets_statement = conn
        .prepare(
            "SELECT id, name, path, file_type, extension, size_bytes, modified_unix, notes, tags, kept_tags
             FROM assets
             ORDER BY id",
        )
        .map_err(|error| error.to_string())?;

    let assets = assets_statement
        .query_map([], |row| {
            Ok(AssetRecord {
                id: row.get::<_, i64>(0)? as usize,
                name: row.get(1)?,
                path: row.get(2)?,
                file_type: row.get(3)?,
                extension: row.get(4)?,
                size_bytes: row.get::<_, i64>(5)? as u64,
                modified_unix: row.get::<_, Option<i64>>(6)?.map(|value| value as u64),
                content_clues: Vec::new(),
                analysis_caption: String::new(),
                analysis_error: String::new(),
                analysis_file_signature: String::new(),
                analysis_status: default_asset_analysis_status(),
                analysis_suggested_tags: Vec::new(),
                analysis_version: 0,
                notes: row.get(7)?,
                tags: serde_json::from_str::<Vec<String>>(&row.get::<_, String>(8)?)
                    .unwrap_or_default(),
                kept_tags: serde_json::from_str::<Vec<String>>(&row.get::<_, String>(9)?)
                    .unwrap_or_default(),
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let virtual_folders = load_folder_children(&conn, None)?;

    Ok(LibraryState {
        root_path,
        assets,
        project_tag_groups: Vec::new(),
        recent_user_tag_ids: Vec::new(),
        source_folders,
        virtual_folders,
    })
}

#[tauri::command]
fn save_library_state(app: AppHandle, state: LibraryState) -> Result<(), String> {
    let mut conn = open_database(&app)?;
    init_schema(&conn)?;

    let transaction = conn.transaction().map_err(|error| error.to_string())?;

    transaction
        .execute("DELETE FROM folder_assets", [])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM virtual_folders", [])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM assets", [])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM app_state WHERE key = 'root_path'", [])
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM app_state WHERE key = 'source_folders'", [])
        .map_err(|error| error.to_string())?;

    if let Some(root_path) = state.root_path.clone() {
        transaction
            .execute(
                "INSERT INTO app_state (key, value) VALUES ('root_path', ?1)",
                params![root_path],
            )
            .map_err(|error| error.to_string())?;
    }

    let source_folders_json =
        serde_json::to_string(&state.source_folders).map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO app_state (key, value) VALUES ('source_folders', ?1)",
            params![source_folders_json],
        )
        .map_err(|error| error.to_string())?;

    for asset in state.assets {
        let tags_json = serde_json::to_string(&asset.tags).map_err(|error| error.to_string())?;
        let kept_tags_json =
            serde_json::to_string(&asset.kept_tags).map_err(|error| error.to_string())?;

        transaction
            .execute(
                "INSERT INTO assets
                 (id, name, path, file_type, extension, size_bytes, modified_unix, notes, tags, kept_tags)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    asset.id as i64,
                    asset.name,
                    asset.path,
                    asset.file_type,
                    asset.extension,
                    asset.size_bytes as i64,
                    asset.modified_unix.map(|value| value as i64),
                    asset.notes,
                    tags_json,
                    kept_tags_json,
                ],
            )
            .map_err(|error| error.to_string())?;
    }

    save_folder_children(&transaction, None, &state.virtual_folders)?;

    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
fn create_inventory(app: AppHandle, name: String) -> Result<OpenedInventory, String> {
    let inventory_name = sanitize_inventory_name(&name)?;
    let document_dir = app
        .path()
        .document_dir()
        .map_err(|error| error.to_string())?;
    let inventory_root = document_dir.join("Inventory").join(&inventory_name);

    if inventory_root.exists() {
        return Err(format!(
            "An Inventory named \"{}\" already exists.",
            inventory_name
        ));
    }

    fs::create_dir_all(&inventory_root).map_err(|error| error.to_string())?;
    for child in ["documents", "exports", "thumbnails", "cache"] {
        fs::create_dir_all(inventory_root.join(child)).map_err(|error| error.to_string())?;
    }

    let manifest_path = inventory_root.join(INVENTORY_MANIFEST_FILENAME);
    let now = unix_now();
    let manifest = InventoryManifest {
        schema_version: INVENTORY_SCHEMA_VERSION,
        kind: INVENTORY_MANIFEST_KIND.to_string(),
        readme: inventory_manifest_readme(&inventory_name),
        inventory: InventoryIdentityState {
            name: inventory_name,
            created_at_unix: now,
            updated_at_unix: now,
        },
        root_path: None,
        source_folders: Vec::new(),
        assets: Vec::new(),
        library_tree: Vec::new(),
        project_tag_groups: Vec::new(),
        recent_user_tag_ids: Vec::new(),
        workspace_state: default_inventory_workspace_state(),
        documents: default_inventory_documents_state(),
        export_settings: default_inventory_export_settings(),
    };

    write_inventory_manifest(&manifest_path, &manifest)?;
    open_inventory_from_parts(manifest_path, manifest)
}

#[tauri::command]
fn open_inventory(path: String) -> Result<OpenedInventory, String> {
    let manifest_path = PathBuf::from(path);
    validate_inventory_manifest_path(&manifest_path)?;
    let mut manifest = read_inventory_manifest(&manifest_path)?;
    reconcile_inventory_document_registry(&manifest_path, &mut manifest)?;
    write_inventory_manifest(&manifest_path, &manifest)?;
    open_inventory_from_parts(manifest_path, manifest)
}

#[tauri::command]
fn save_inventory(
    path: String,
    state: LibraryState,
    workspace_state: InventoryWorkspaceState,
) -> Result<(), String> {
    let manifest_path = PathBuf::from(path);
    validate_inventory_manifest_path(&manifest_path)?;
    let existing_manifest = read_inventory_manifest(&manifest_path)?;

    let manifest = InventoryManifest {
        schema_version: INVENTORY_SCHEMA_VERSION,
        kind: INVENTORY_MANIFEST_KIND.to_string(),
        readme: existing_manifest.readme,
        inventory: InventoryIdentityState {
            name: existing_manifest.inventory.name,
            created_at_unix: existing_manifest.inventory.created_at_unix,
            updated_at_unix: unix_now(),
        },
        root_path: state.root_path,
        source_folders: state.source_folders,
        assets: state.assets,
        library_tree: state.virtual_folders,
        project_tag_groups: state.project_tag_groups,
        recent_user_tag_ids: state.recent_user_tag_ids,
        workspace_state,
        documents: existing_manifest.documents,
        export_settings: existing_manifest.export_settings,
    };

    write_inventory_manifest(&manifest_path, &manifest)
}

#[tauri::command]
fn create_nvd_document(
    inventory_manifest_path: String,
    title: String,
) -> Result<OpenedNvdDocument, String> {
    let document_title = sanitize_document_title(&title)?;
    let manifest_path = PathBuf::from(inventory_manifest_path);
    validate_inventory_manifest_path(&manifest_path)?;
    let mut manifest = read_inventory_manifest(&manifest_path)?;
    let inventory_root = inventory_root_from_manifest_path(&manifest_path)?;

    let documents_dir = inventory_root.join("documents");
    fs::create_dir_all(&documents_dir).map_err(|error| error.to_string())?;
    let document_path = unique_document_path(&documents_dir, &document_title, "nvd");
    let now = unix_now();
    let document = NvdDocument {
        schema_version: NVD_SCHEMA_VERSION,
        kind: NVD_DOCUMENT_KIND.to_string(),
        title: document_title,
        created_at_unix: now,
        updated_at_unix: now,
        font_family: default_nvd_font_family(),
        font_size: default_nvd_font_size(),
        layout_mode: default_nvd_layout_mode(),
        page_layout: default_nvd_page_layout(),
        blocks: vec![NvdBlock {
            id: format!("block-{}", now),
            kind: "p".to_string(),
            keep_lines_together: None,
            keep_with_next: None,
            line_height: None,
            orphan_line_count: None,
            space_after_pt: None,
            space_before_pt: None,
            text: String::new(),
            runs: Vec::new(),
            text_align: None,
            embed: None,
            widow_line_count: None,
        }],
        page_objects: Vec::new(),
        styles: BTreeMap::new(),
    };

    write_nvd_document(&document_path, &document)?;
    let opened_document = open_nvd_document_from_parts(document_path.clone(), document)?;

    if let Err(error) = upsert_inventory_nvd_document(
        &manifest_path,
        &mut manifest,
        &opened_document.entry,
        &opened_document.asset,
    ) {
        let _ = fs::remove_file(&document_path);
        return Err(error);
    }

    Ok(opened_document)
}

#[tauri::command]
fn open_nvd_document(path: String) -> Result<OpenedNvdDocument, String> {
    let document_path = PathBuf::from(path);
    validate_nvd_document_path(&document_path)?;
    let document = read_nvd_document(&document_path)?;
    open_nvd_document_from_parts(document_path, document)
}

#[tauri::command]
fn save_nvd_document(
    path: String,
    mut document: NvdDocument,
    inventory_manifest_path: Option<String>,
) -> Result<OpenedNvdDocument, String> {
    let document_path = PathBuf::from(path);
    validate_nvd_document_path(&document_path)?;

    document.title = sanitize_document_title(&document.title)?;
    document.updated_at_unix = unix_now();
    document = normalize_nvd_document(document);

    write_nvd_document(&document_path, &document)?;
    let opened_document = open_nvd_document_from_parts(document_path, document)?;

    if let Some(inventory_manifest_path) = inventory_manifest_path {
        let manifest_path = PathBuf::from(inventory_manifest_path);
        validate_inventory_manifest_path(&manifest_path)?;
        let mut manifest = read_inventory_manifest(&manifest_path)?;

        if inventory_owns_document_path(&manifest_path, Path::new(&opened_document.path))? {
            upsert_inventory_nvd_document(
                &manifest_path,
                &mut manifest,
                &opened_document.entry,
                &opened_document.asset,
            )?;
        }
    }

    Ok(opened_document)
}

#[tauri::command]
fn create_nvv_document(
    inventory_manifest_path: String,
    title: String,
) -> Result<OpenedNvvDocument, String> {
    let document_title = sanitize_document_title(&title)?;
    let manifest_path = PathBuf::from(inventory_manifest_path);
    validate_inventory_manifest_path(&manifest_path)?;
    let mut manifest = read_inventory_manifest(&manifest_path)?;
    let vectors_dir = inventory_vectors_dir(&manifest_path)?;
    fs::create_dir_all(&vectors_dir).map_err(|error| error.to_string())?;
    let document_path = unique_document_path(&vectors_dir, &document_title, "nvv");
    let now = unix_now();
    let document = NvvDocument {
        schema_version: NVV_SCHEMA_VERSION,
        kind: NVV_DOCUMENT_KIND.to_string(),
        title: document_title,
        created_at_unix: now,
        updated_at_unix: now,
        canvas_width: 512.0,
        canvas_height: 512.0,
        paths: Vec::new(),
    };
    write_nvv_document(&document_path, &document)?;
    let opened = open_nvv_document_from_parts(document_path.clone(), document)?;

    if let Err(error) =
        upsert_inventory_nvv_document(&manifest_path, &mut manifest, &opened.entry, &opened.asset)
    {
        let _ = fs::remove_file(&document_path);
        return Err(error);
    }

    Ok(opened)
}

#[tauri::command]
fn open_nvv_document(path: String) -> Result<OpenedNvvDocument, String> {
    let path = PathBuf::from(path);
    validate_nvv_document_path(&path)?;
    let document = read_nvv_document(&path)?;
    open_nvv_document_from_parts(path, document)
}

#[tauri::command]
fn save_nvv_document(
    path: String,
    mut document: NvvDocument,
    inventory_manifest_path: Option<String>,
) -> Result<OpenedNvvDocument, String> {
    let path = PathBuf::from(path);
    validate_nvv_document_path(&path)?;
    document.schema_version = NVV_SCHEMA_VERSION;
    document.kind = NVV_DOCUMENT_KIND.to_string();
    document.title = sanitize_document_title(&document.title)?;
    document.updated_at_unix = unix_now();
    write_nvv_document(&path, &document)?;
    let opened = open_nvv_document_from_parts(path, document)?;
    if let Some(manifest_path) = inventory_manifest_path {
        let manifest_path = PathBuf::from(manifest_path);
        validate_inventory_manifest_path(&manifest_path)?;
        let mut manifest = read_inventory_manifest(&manifest_path)?;

        if inventory_owns_vector_path(&manifest_path, Path::new(&opened.path))? {
            upsert_inventory_nvv_document(
                &manifest_path,
                &mut manifest,
                &opened.entry,
                &opened.asset,
            )?;
        }
    }
    Ok(opened)
}

#[tauri::command]
fn rename_nvd_document(
    inventory_manifest_path: String,
    path: String,
    title: String,
    document: Option<NvdDocument>,
) -> Result<OpenedNvdDocument, String> {
    let manifest_path = PathBuf::from(inventory_manifest_path);
    validate_inventory_manifest_path(&manifest_path)?;
    let mut manifest = read_inventory_manifest(&manifest_path)?;
    let document_path = PathBuf::from(path);
    validate_nvd_document_path(&document_path)?;

    if !inventory_owns_document_path(&manifest_path, &document_path)? {
        return Err("Only Inventory-owned NVD documents can be renamed.".to_string());
    }

    let document_title = sanitize_document_title(&title)?;
    let mut document = document.unwrap_or(read_nvd_document(&document_path)?);
    document.title = document_title.clone();
    document.updated_at_unix = unix_now();
    document = normalize_nvd_document(document);

    let parent = document_path
        .parent()
        .ok_or_else(|| "NVD document has no parent folder.".to_string())?;
    let renamed_path = parent.join(format!("{document_title}.nvd"));
    let document_path_key = normalized_filesystem_path_key(&document_path);
    let renamed_path_key = normalized_filesystem_path_key(&renamed_path);
    let path_changed = document_path != renamed_path;

    if path_changed && document_path_key != renamed_path_key && renamed_path.exists() {
        return Err(format!(
            "An NVD document named \"{}\" already exists.",
            document_title
        ));
    }

    if path_changed {
        fs::rename(&document_path, &renamed_path).map_err(|error| error.to_string())?;
    }

    if let Err(error) = write_nvd_document(&renamed_path, &document) {
        if path_changed {
            let _ = fs::rename(&renamed_path, &document_path);
        }
        return Err(error);
    }

    let opened_document = open_nvd_document_from_parts(renamed_path, document)?;
    replace_inventory_nvd_document(
        &manifest_path,
        &mut manifest,
        &document_path,
        &opened_document,
    )?;

    Ok(opened_document)
}

#[tauri::command]
fn delete_nvd_document(
    inventory_manifest_path: String,
    path: String,
) -> Result<InventoryDocumentEntry, String> {
    let manifest_path = PathBuf::from(inventory_manifest_path);
    validate_inventory_manifest_path(&manifest_path)?;
    let mut manifest = read_inventory_manifest(&manifest_path)?;
    let document_path = PathBuf::from(path);
    validate_nvd_document_path(&document_path)?;

    if !inventory_owns_document_path(&manifest_path, &document_path)? {
        return Err("Only Inventory-owned NVD documents can be deleted.".to_string());
    }

    let document = read_nvd_document(&document_path)?;
    let entry = inventory_document_entry_from_nvd(&document_path, &document);
    fs::remove_file(&document_path).map_err(|error| error.to_string())?;
    remove_inventory_nvd_document(&manifest_path, &mut manifest, &entry)?;

    Ok(entry)
}

fn is_symlink_dir(path: &Path) -> bool {
    fs::symlink_metadata(path)
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false)
}

fn supported_file_type(extension: &str) -> Option<&'static str> {
    match extension {
        "png" | "jpg" | "jpeg" | "webp" | "avif" | "gif" | "svg" | "bmp" | "tif" | "tiff"
        | "tga" | "dds" | "exr" | "hdr" | "ico" => Some("Image"),
        "glb" | "gltf" | "obj" | "fbx" | "blend" | "dae" | "stl" | "usd" | "usdz" | "3ds" => {
            Some("3D")
        }
        "wav" | "mp3" | "ogg" | "flac" | "aif" | "aiff" | "m4a" => Some("Audio"),
        "pdf" | "txt" | "md" | "nvd" | "nvv" | "json" | "csv" | "yaml" | "yml" | "xml"
        | "license" => Some("Document"),
        "zip" | "rar" | "7z" | "tar" | "gz" => Some("Archive"),
        _ => None,
    }
}

fn infer_content_clues(path: &Path, extension: &str) -> Vec<String> {
    if !supports_content_clues(extension) {
        return Vec::new();
    }

    let Ok(contents) = read_limited_text_file(path, MAX_CONTENT_CLUE_BYTES) else {
        return Vec::new();
    };

    extract_content_clues_from_text(&contents)
}

fn supports_content_clues(extension: &str) -> bool {
    matches!(
        extension,
        "txt" | "md" | "json" | "csv" | "yaml" | "yml" | "xml" | "license"
    )
}

fn read_limited_text_file(path: &Path, max_bytes: usize) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut buffer = vec![0_u8; max_bytes];
    let bytes_read = file.read(&mut buffer).map_err(|error| error.to_string())?;
    buffer.truncate(bytes_read);

    if buffer.contains(&0) {
        return Err("File contains binary data.".to_string());
    }

    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

fn extract_content_clues_from_text(text: &str) -> Vec<String> {
    let mut clues = Vec::new();
    let mut seen = HashSet::new();

    for raw_term in text
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|term| !term.is_empty())
    {
        let term = raw_term.to_ascii_lowercase();

        if should_ignore_content_clue_term(&term) || !seen.insert(term.clone()) {
            continue;
        }

        clues.push(term);

        if clues.len() >= MAX_CONTENT_CLUES {
            break;
        }
    }

    clues
}

fn should_ignore_content_clue_term(term: &str) -> bool {
    if term.len() <= 2
        || term.len() >= 32
        || term.chars().all(|character| character.is_ascii_digit())
        || term.starts_with('v')
            && term[1..]
                .chars()
                .all(|character| character.is_ascii_digit())
    {
        return true;
    }

    matches!(
        term,
        "all"
            | "and"
            | "are"
            | "asset"
            | "assets"
            | "but"
            | "csv"
            | "data"
            | "doc"
            | "docs"
            | "draft"
            | "file"
            | "files"
            | "final"
            | "for"
            | "from"
            | "guide"
            | "into"
            | "json"
            | "library"
            | "markdown"
            | "misc"
            | "note"
            | "notes"
            | "null"
            | "pdf"
            | "temp"
            | "text"
            | "that"
            | "the"
            | "this"
            | "txt"
            | "with"
            | "xml"
            | "yaml"
            | "yml"
    )
}

fn stable_asset_id(path: &str) -> usize {
    let mut hash = 14_695_981_039_346_656_037u64;

    for byte in path.to_lowercase().as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(1_099_511_628_211);
    }

    (hash % 9_000_000_000_000_000).max(1) as usize
}

fn inventory_root_from_manifest_path(manifest_path: &Path) -> Result<PathBuf, String> {
    manifest_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Inventory manifest has no parent folder.".to_string())
}

fn inventory_documents_dir(manifest_path: &Path) -> Result<PathBuf, String> {
    Ok(inventory_root_from_manifest_path(manifest_path)?.join("documents"))
}

fn inventory_vectors_dir(manifest_path: &Path) -> Result<PathBuf, String> {
    Ok(inventory_root_from_manifest_path(manifest_path)?.join("vectors"))
}

fn inventory_owns_document_path(
    manifest_path: &Path,
    document_path: &Path,
) -> Result<bool, String> {
    let documents_dir = inventory_documents_dir(manifest_path)?;
    let documents_key = normalized_filesystem_path_key(&documents_dir);
    let document_key = normalized_filesystem_path_key(document_path);

    Ok(document_key.starts_with(&format!("{documents_key}/")))
}

fn inventory_owns_vector_path(manifest_path: &Path, vector_path: &Path) -> Result<bool, String> {
    let vectors_dir = inventory_vectors_dir(manifest_path)?;
    let vectors_key = normalized_filesystem_path_key(&vectors_dir);
    let vector_key = normalized_filesystem_path_key(vector_path);

    Ok(vector_key.starts_with(&format!("{vectors_key}/")))
}

fn normalized_filesystem_path_key(path: &Path) -> String {
    let resolved = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    resolved
        .to_string_lossy()
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_lowercase()
}

fn inventory_document_entry_from_nvd(
    document_path: &Path,
    document: &NvdDocument,
) -> InventoryDocumentEntry {
    let path = document_path.to_string_lossy().to_string();
    let asset_id = stable_asset_id(&path);

    InventoryDocumentEntry {
        id: format!("nvd-{asset_id}"),
        asset_id,
        kind: document.kind.clone(),
        title: document.title.clone(),
        path,
        created_at_unix: document.created_at_unix,
        updated_at_unix: document.updated_at_unix,
    }
}

fn asset_record_from_nvd(
    document_path: &Path,
    document: &NvdDocument,
) -> Result<AssetRecord, String> {
    let metadata = fs::metadata(document_path).map_err(|error| error.to_string())?;
    let path = document_path.to_string_lossy().to_string();
    let name = document_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled.nvd")
        .to_string();
    let modified_unix = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_secs())
        .or(Some(document.updated_at_unix));

    Ok(AssetRecord {
        id: stable_asset_id(&path),
        name,
        path,
        file_type: "Document".to_string(),
        extension: "nvd".to_string(),
        size_bytes: metadata.len(),
        modified_unix,
        content_clues: Vec::new(),
        analysis_caption: String::new(),
        analysis_error: String::new(),
        analysis_file_signature: String::new(),
        analysis_status: default_asset_analysis_status(),
        analysis_suggested_tags: Vec::new(),
        analysis_version: 0,
        kept_tags: Vec::new(),
        notes: String::new(),
        tags: Vec::new(),
    })
}

fn upsert_inventory_nvd_document(
    manifest_path: &Path,
    manifest: &mut InventoryManifest,
    entry: &InventoryDocumentEntry,
    asset: &AssetRecord,
) -> Result<(), String> {
    upsert_inventory_document_entry(&mut manifest.documents.nvd_documents, entry);
    upsert_manifest_asset(&mut manifest.assets, asset);
    remove_asset_id_from_virtual_folders(&mut manifest.library_tree, entry.asset_id);
    remove_asset_id_from_source_folders(&mut manifest.source_folders, entry.asset_id);
    manifest.inventory.updated_at_unix = unix_now();
    write_inventory_manifest(manifest_path, manifest)
}

fn upsert_inventory_nvv_document(
    manifest_path: &Path,
    manifest: &mut InventoryManifest,
    entry: &InventoryDocumentEntry,
    asset: &AssetRecord,
) -> Result<(), String> {
    upsert_inventory_document_entry(&mut manifest.documents.nvv_documents, entry);
    upsert_manifest_asset(&mut manifest.assets, asset);
    remove_asset_id_from_virtual_folders(&mut manifest.library_tree, entry.asset_id);
    remove_asset_id_from_source_folders(&mut manifest.source_folders, entry.asset_id);
    manifest.inventory.updated_at_unix = unix_now();
    write_inventory_manifest(manifest_path, manifest)
}

fn replace_inventory_nvd_document(
    manifest_path: &Path,
    manifest: &mut InventoryManifest,
    previous_path: &Path,
    opened_document: &OpenedNvdDocument,
) -> Result<(), String> {
    let previous_path_key = normalized_filesystem_path_key(previous_path);
    let previous_entry = manifest
        .documents
        .nvd_documents
        .iter()
        .find(|entry| normalized_filesystem_path_key(Path::new(&entry.path)) == previous_path_key)
        .cloned();
    let previous_asset_id = previous_entry
        .as_ref()
        .map(|entry| entry.asset_id)
        .filter(|asset_id| *asset_id != 0)
        .unwrap_or_else(|| stable_asset_id(&previous_path.to_string_lossy()));
    let previous_asset = manifest
        .assets
        .iter()
        .find(|asset| {
            asset.id == previous_asset_id
                || normalized_filesystem_path_key(Path::new(&asset.path)) == previous_path_key
        })
        .cloned();
    let mut next_asset = opened_document.asset.clone();

    if let Some(previous_asset) = previous_asset {
        next_asset.kept_tags = previous_asset.kept_tags;
        next_asset.notes = previous_asset.notes;
        next_asset.tags = previous_asset.tags;
    }

    manifest.documents.nvd_documents.retain(|entry| {
        normalized_filesystem_path_key(Path::new(&entry.path)) != previous_path_key
    });
    manifest.assets.retain(|asset| {
        asset.id != previous_asset_id
            && normalized_filesystem_path_key(Path::new(&asset.path)) != previous_path_key
    });
    remove_asset_id_from_virtual_folders(&mut manifest.library_tree, previous_asset_id);
    remove_asset_id_from_virtual_folders(
        &mut manifest.library_tree,
        opened_document.entry.asset_id,
    );
    remove_asset_id_from_source_folders(&mut manifest.source_folders, previous_asset_id);
    remove_asset_id_from_source_folders(
        &mut manifest.source_folders,
        opened_document.entry.asset_id,
    );

    if manifest.workspace_state.selected_asset_id == Some(previous_asset_id) {
        manifest.workspace_state.selected_asset_id = Some(opened_document.entry.asset_id);
    }

    if manifest
        .workspace_state
        .active_nvd_document_path
        .as_ref()
        .is_some_and(|path| normalized_filesystem_path_key(Path::new(path)) == previous_path_key)
    {
        manifest.workspace_state.active_nvd_document_path = Some(opened_document.path.clone());
    }

    upsert_inventory_document_entry(
        &mut manifest.documents.nvd_documents,
        &opened_document.entry,
    );
    upsert_manifest_asset(&mut manifest.assets, &next_asset);
    manifest.inventory.updated_at_unix = unix_now();
    write_inventory_manifest(manifest_path, manifest)
}

fn remove_inventory_nvd_document(
    manifest_path: &Path,
    manifest: &mut InventoryManifest,
    entry: &InventoryDocumentEntry,
) -> Result<(), String> {
    let document_path_key = normalized_filesystem_path_key(Path::new(&entry.path));

    manifest.documents.nvd_documents.retain(|candidate| {
        candidate.asset_id != entry.asset_id
            && normalized_filesystem_path_key(Path::new(&candidate.path)) != document_path_key
    });
    manifest.assets.retain(|asset| {
        asset.id != entry.asset_id
            && normalized_filesystem_path_key(Path::new(&asset.path)) != document_path_key
    });
    remove_asset_id_from_virtual_folders(&mut manifest.library_tree, entry.asset_id);
    remove_asset_id_from_source_folders(&mut manifest.source_folders, entry.asset_id);

    if manifest.workspace_state.selected_asset_id == Some(entry.asset_id) {
        manifest.workspace_state.selected_asset_id = None;
    }

    if manifest
        .workspace_state
        .active_nvd_document_path
        .as_ref()
        .is_some_and(|path| normalized_filesystem_path_key(Path::new(path)) == document_path_key)
    {
        manifest.workspace_state.active_nvd_document_path = None;
    }

    manifest.inventory.updated_at_unix = unix_now();
    write_inventory_manifest(manifest_path, manifest)
}

fn remove_asset_id_from_virtual_folders(folders: &mut [VirtualFolderState], asset_id: usize) {
    for folder in folders {
        folder.asset_ids.retain(|candidate| *candidate != asset_id);
        remove_asset_id_from_virtual_folders(&mut folder.children, asset_id);
    }
}

fn remove_asset_id_from_source_folders(folders: &mut [SourceFolderState], asset_id: usize) {
    for folder in folders {
        folder.asset_ids.retain(|candidate| *candidate != asset_id);
    }
}

fn upsert_inventory_document_entry(
    entries: &mut Vec<InventoryDocumentEntry>,
    entry: &InventoryDocumentEntry,
) {
    let entry_path_key = normalized_filesystem_path_key(Path::new(&entry.path));

    if let Some(existing_entry) = entries.iter_mut().find(|candidate| {
        normalized_filesystem_path_key(Path::new(&candidate.path)) == entry_path_key
    }) {
        *existing_entry = entry.clone();
    } else {
        entries.push(entry.clone());
    }

    entries.sort_by(|first, second| {
        first
            .title
            .to_lowercase()
            .cmp(&second.title.to_lowercase())
            .then_with(|| first.path.to_lowercase().cmp(&second.path.to_lowercase()))
    });
}

fn upsert_manifest_asset(assets: &mut Vec<AssetRecord>, asset: &AssetRecord) {
    let asset_path_key = normalized_filesystem_path_key(Path::new(&asset.path));

    if let Some(existing_asset) = assets.iter_mut().find(|candidate| {
        normalized_filesystem_path_key(Path::new(&candidate.path)) == asset_path_key
    }) {
        existing_asset.id = asset.id;
        existing_asset.path = asset.path.clone();
        existing_asset.file_type = asset.file_type.clone();
        existing_asset.extension = asset.extension.clone();
        existing_asset.size_bytes = asset.size_bytes;
        existing_asset.modified_unix = asset.modified_unix;
    } else {
        assets.push(asset.clone());
    }
}

fn reconcile_inventory_document_registry(
    manifest_path: &Path,
    manifest: &mut InventoryManifest,
) -> Result<(), String> {
    let documents_dir = inventory_documents_dir(manifest_path)?;
    let vectors_dir = inventory_vectors_dir(manifest_path)?;
    fs::create_dir_all(&documents_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&vectors_dir).map_err(|error| error.to_string())?;
    migrate_inventory_vectors_from_documents(manifest, &documents_dir, &vectors_dir)?;
    let mut document_paths = BTreeMap::<String, PathBuf>::new();
    let previous_document_asset_ids = manifest
        .documents
        .nvd_documents
        .iter()
        .filter(|entry| entry.asset_id != 0)
        .map(|entry| entry.asset_id)
        .collect::<HashSet<_>>();
    let previous_document_paths = manifest
        .documents
        .nvd_documents
        .iter()
        .map(|entry| normalized_filesystem_path_key(Path::new(&entry.path)))
        .collect::<HashSet<_>>();

    for entry in &manifest.documents.nvd_documents {
        let path = PathBuf::from(&entry.path);

        if inventory_owns_document_path(manifest_path, &path)? {
            document_paths.insert(normalized_filesystem_path_key(&path), path);
        }
    }

    for path in discover_nvd_document_paths(&documents_dir) {
        document_paths.insert(normalized_filesystem_path_key(&path), path);
    }

    let mut next_document_entries = Vec::new();
    let mut next_document_asset_ids = HashSet::new();
    let mut next_document_paths = HashSet::new();

    for document_path in document_paths.into_values() {
        if !document_path.exists() {
            continue;
        }

        let Ok(document) = read_nvd_document(&document_path) else {
            continue;
        };
        let entry = inventory_document_entry_from_nvd(&document_path, &document);
        let asset = asset_record_from_nvd(&document_path, &document)?;
        next_document_asset_ids.insert(entry.asset_id);
        next_document_paths.insert(normalized_filesystem_path_key(Path::new(&entry.path)));
        upsert_inventory_document_entry(&mut next_document_entries, &entry);
        upsert_manifest_asset(&mut manifest.assets, &asset);
    }

    manifest.documents.nvd_documents = next_document_entries;
    manifest.assets.retain(|asset| {
        let asset_path = normalized_filesystem_path_key(Path::new(&asset.path));
        let was_registered_document = previous_document_asset_ids.contains(&asset.id)
            || previous_document_paths.contains(&asset_path);
        !was_registered_document
            || next_document_asset_ids.contains(&asset.id)
            || next_document_paths.contains(&asset_path)
    });
    for asset_id in next_document_asset_ids {
        remove_asset_id_from_virtual_folders(&mut manifest.library_tree, asset_id);
        remove_asset_id_from_source_folders(&mut manifest.source_folders, asset_id);
    }

    let mut vector_paths = BTreeMap::<String, PathBuf>::new();
    let previous_vector_asset_ids = manifest
        .documents
        .nvv_documents
        .iter()
        .filter(|entry| entry.asset_id != 0)
        .map(|entry| entry.asset_id)
        .collect::<HashSet<_>>();
    let previous_vector_paths = manifest
        .documents
        .nvv_documents
        .iter()
        .map(|entry| normalized_filesystem_path_key(Path::new(&entry.path)))
        .collect::<HashSet<_>>();

    for entry in &manifest.documents.nvv_documents {
        let path = PathBuf::from(&entry.path);

        if inventory_owns_vector_path(manifest_path, &path)? {
            vector_paths.insert(normalized_filesystem_path_key(&path), path);
        }
    }

    for path in discover_native_document_paths(&vectors_dir, "nvv") {
        vector_paths.insert(normalized_filesystem_path_key(&path), path);
    }

    let mut next_vector_entries = Vec::new();
    let mut next_vector_asset_ids = HashSet::new();
    let mut next_vector_paths = HashSet::new();

    for vector_path in vector_paths.into_values() {
        if !vector_path.exists() {
            continue;
        }

        let Ok(vector) = read_nvv_document(&vector_path) else {
            continue;
        };
        if nvv_document_has_removed_shape_data(&vector_path) {
            write_nvv_document(&vector_path, &vector)?;
        }
        let opened = open_nvv_document_from_parts(vector_path, vector)?;
        next_vector_asset_ids.insert(opened.entry.asset_id);
        next_vector_paths.insert(normalized_filesystem_path_key(Path::new(
            &opened.entry.path,
        )));
        upsert_inventory_document_entry(&mut next_vector_entries, &opened.entry);
        upsert_manifest_asset(&mut manifest.assets, &opened.asset);
    }

    manifest.documents.nvv_documents = next_vector_entries;
    manifest.assets.retain(|asset| {
        let asset_path = normalized_filesystem_path_key(Path::new(&asset.path));
        let was_registered_vector = previous_vector_asset_ids.contains(&asset.id)
            || previous_vector_paths.contains(&asset_path);
        !was_registered_vector
            || next_vector_asset_ids.contains(&asset.id)
            || next_vector_paths.contains(&asset_path)
    });
    for asset_id in next_vector_asset_ids {
        remove_asset_id_from_virtual_folders(&mut manifest.library_tree, asset_id);
        remove_asset_id_from_source_folders(&mut manifest.source_folders, asset_id);
    }
    for asset_id in previous_vector_asset_ids {
        remove_asset_id_from_virtual_folders(&mut manifest.library_tree, asset_id);
        remove_asset_id_from_source_folders(&mut manifest.source_folders, asset_id);
    }

    Ok(())
}

fn migrate_inventory_vectors_from_documents(
    manifest: &mut InventoryManifest,
    documents_dir: &Path,
    vectors_dir: &Path,
) -> Result<(), String> {
    for source_path in discover_native_document_paths(documents_dir, "nvv") {
        let Ok(vector) = read_nvv_document(&source_path) else {
            continue;
        };
        let source_asset_id = stable_asset_id(&source_path.to_string_lossy());
        let target_path = unique_document_path(vectors_dir, &vector.title, "nvv");

        write_nvv_document(&target_path, &vector)?;
        if let Err(error) = fs::remove_file(&source_path) {
            let _ = fs::remove_file(&target_path);
            return Err(format!(
                "Could not finish moving Inventory-owned vector from {} to {}: {error}",
                source_path.display(),
                target_path.display()
            ));
        }

        if manifest.workspace_state.selected_asset_id == Some(source_asset_id) {
            manifest.workspace_state.selected_asset_id =
                Some(stable_asset_id(&target_path.to_string_lossy()));
        }
        remove_asset_id_from_virtual_folders(&mut manifest.library_tree, source_asset_id);
        remove_asset_id_from_source_folders(&mut manifest.source_folders, source_asset_id);
    }
    Ok(())
}

fn discover_nvd_document_paths(root: &Path) -> Vec<PathBuf> {
    discover_native_document_paths(root, "nvd")
}

fn discover_native_document_paths(root: &Path, extension: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut queue = VecDeque::from([root.to_path_buf()]);

    while let Some(folder) = queue.pop_front() {
        let Ok(entries) = fs::read_dir(folder) else {
            continue;
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let Ok(metadata) = entry.metadata() else {
                continue;
            };

            if metadata.is_dir() {
                if !is_symlink_dir(&path) {
                    queue.push_back(path);
                }
                continue;
            }

            if metadata.is_file()
                && path
                    .extension()
                    .and_then(|value| value.to_str())
                    .is_some_and(|candidate| candidate.eq_ignore_ascii_case(extension))
            {
                paths.push(path);
            }
        }
    }

    paths
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("inventory.sqlite");
    Connection::open(database_path).map_err(|error| error.to_string())
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            file_type TEXT NOT NULL,
            extension TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            modified_unix INTEGER,
            notes TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '[]',
            kept_tags TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS virtual_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT REFERENCES virtual_folders(id) ON DELETE CASCADE,
            sort_order INTEGER NOT NULL,
            path_segment TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '[]',
            rules TEXT NOT NULL DEFAULT '[]',
            disk_path TEXT,
            is_planned_on_disk INTEGER NOT NULL DEFAULT 0,
            suggested_tags TEXT NOT NULL DEFAULT '[]',
            template_id TEXT
        );

        CREATE TABLE IF NOT EXISTS folder_assets (
            folder_id TEXT NOT NULL REFERENCES virtual_folders(id) ON DELETE CASCADE,
            asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
            PRIMARY KEY (folder_id, asset_id)
        );
        ",
    )
    .map_err(|error| error.to_string())?;

    ensure_assets_columns(conn).and_then(|_| ensure_virtual_folder_columns(conn))
}

fn ensure_assets_columns(conn: &Connection) -> Result<(), String> {
    let mut statement = conn
        .prepare("PRAGMA table_info(assets)")
        .map_err(|error| error.to_string())?;

    let column_names = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    if !column_names.iter().any(|name| name == "notes") {
        conn.execute(
            "ALTER TABLE assets ADD COLUMN notes TEXT NOT NULL DEFAULT ''",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "tags") {
        conn.execute(
            "ALTER TABLE assets ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "kept_tags") {
        conn.execute(
            "ALTER TABLE assets ADD COLUMN kept_tags TEXT NOT NULL DEFAULT '[]'",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn ensure_virtual_folder_columns(conn: &Connection) -> Result<(), String> {
    let mut statement = conn
        .prepare("PRAGMA table_info(virtual_folders)")
        .map_err(|error| error.to_string())?;

    let column_names = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    if !column_names.iter().any(|name| name == "suggested_tags") {
        conn.execute(
            "ALTER TABLE virtual_folders ADD COLUMN suggested_tags TEXT NOT NULL DEFAULT '[]'",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "tags") {
        conn.execute(
            "ALTER TABLE virtual_folders ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "rules") {
        conn.execute(
            "ALTER TABLE virtual_folders ADD COLUMN rules TEXT NOT NULL DEFAULT '[]'",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "path_segment") {
        conn.execute(
            "ALTER TABLE virtual_folders ADD COLUMN path_segment TEXT NOT NULL DEFAULT ''",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "disk_path") {
        conn.execute("ALTER TABLE virtual_folders ADD COLUMN disk_path TEXT", [])
            .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "is_planned_on_disk") {
        conn.execute(
            "ALTER TABLE virtual_folders ADD COLUMN is_planned_on_disk INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    if !column_names.iter().any(|name| name == "template_id") {
        conn.execute(
            "ALTER TABLE virtual_folders ADD COLUMN template_id TEXT",
            [],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn load_folder_children(
    conn: &Connection,
    parent_id: Option<&str>,
) -> Result<Vec<VirtualFolderState>, String> {
    let mut folders = Vec::new();

    if let Some(parent_id) = parent_id {
        let mut statement = conn
            .prepare(
                "SELECT id, name, suggested_tags, template_id, tags, rules, path_segment, disk_path, is_planned_on_disk
                 FROM virtual_folders
                 WHERE parent_id = ?1
                 ORDER BY sort_order, name",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map(params![parent_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, i64>(8)? != 0,
                ))
            })
            .map_err(|error| error.to_string())?;

        for row in rows {
            let (
                id,
                name,
                suggested_tags_json,
                template_id,
                tags_json,
                rules_json,
                path_segment,
                disk_path,
                is_planned_on_disk,
            ) = row.map_err(|error| error.to_string())?;
            folders.push(load_folder(
                conn,
                id,
                name,
                suggested_tags_json,
                template_id,
                tags_json,
                rules_json,
                path_segment,
                disk_path,
                is_planned_on_disk,
            )?);
        }
    } else {
        let mut statement = conn
            .prepare(
                "SELECT id, name, suggested_tags, template_id, tags, rules, path_segment, disk_path, is_planned_on_disk
                 FROM virtual_folders
                 WHERE parent_id IS NULL
                 ORDER BY sort_order, name",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, i64>(8)? != 0,
                ))
            })
            .map_err(|error| error.to_string())?;

        for row in rows {
            let (
                id,
                name,
                suggested_tags_json,
                template_id,
                tags_json,
                rules_json,
                path_segment,
                disk_path,
                is_planned_on_disk,
            ) = row.map_err(|error| error.to_string())?;
            folders.push(load_folder(
                conn,
                id,
                name,
                suggested_tags_json,
                template_id,
                tags_json,
                rules_json,
                path_segment,
                disk_path,
                is_planned_on_disk,
            )?);
        }
    }

    Ok(folders)
}

fn load_folder(
    conn: &Connection,
    id: String,
    name: String,
    suggested_tags_json: String,
    template_id: Option<String>,
    tags_json: String,
    rules_json: String,
    path_segment: String,
    disk_path: Option<String>,
    is_planned_on_disk: bool,
) -> Result<VirtualFolderState, String> {
    let mut asset_statement = conn
        .prepare(
            "SELECT asset_id
             FROM folder_assets
             WHERE folder_id = ?1
             ORDER BY asset_id",
        )
        .map_err(|error| error.to_string())?;

    let asset_ids = asset_statement
        .query_map(params![id.as_str()], |row| {
            Ok(row.get::<_, i64>(0)? as usize)
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let children = load_folder_children(conn, Some(id.as_str()))?;
    let suggested_tags =
        serde_json::from_str::<Vec<String>>(&suggested_tags_json).unwrap_or_default();
    let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();
    let rules = serde_json::from_str::<Vec<LibraryNodeRuleState>>(&rules_json).unwrap_or_default();

    Ok(VirtualFolderState {
        id,
        name,
        asset_ids,
        children,
        disk_path,
        is_planned_on_disk,
        path_segment,
        rules,
        suggested_tags,
        tags,
        template_id,
    })
}

fn save_folder_children(
    conn: &Connection,
    parent_id: Option<&str>,
    folders: &[VirtualFolderState],
) -> Result<(), String> {
    for (index, folder) in folders.iter().enumerate() {
        let suggested_tags_json =
            serde_json::to_string(&folder.suggested_tags).map_err(|error| error.to_string())?;
        let tags_json = serde_json::to_string(&folder.tags).map_err(|error| error.to_string())?;
        let rules_json = serde_json::to_string(&folder.rules).map_err(|error| error.to_string())?;

        conn.execute(
            "INSERT INTO virtual_folders (id, name, parent_id, sort_order, path_segment, tags, rules, disk_path, is_planned_on_disk, suggested_tags, template_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                folder.id,
                folder.name,
                parent_id,
                index as i64,
                folder.path_segment,
                tags_json,
                rules_json,
                folder.disk_path.as_deref(),
                if folder.is_planned_on_disk { 1_i64 } else { 0_i64 },
                suggested_tags_json,
                folder.template_id.as_deref()
            ],
        )
        .map_err(|error| error.to_string())?;

        for asset_id in &folder.asset_ids {
            conn.execute(
                "INSERT INTO folder_assets (folder_id, asset_id)
                 VALUES (?1, ?2)",
                params![folder.id, *asset_id as i64],
            )
            .map_err(|error| error.to_string())?;
        }

        save_folder_children(conn, Some(folder.id.as_str()), &folder.children)?;
    }

    Ok(())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    let path = PathBuf::from(path);

    if !path.exists() {
        return Err("File does not exist.".to_string());
    }

    if !path.is_file() {
        return Err("Selected path is not a file.".to_string());
    }

    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;

    if metadata.len() > MAX_PREVIEW_BYTES {
        return Err(format!(
            "File is too large to preview in-app ({} MB limit).",
            MAX_PREVIEW_BYTES / 1024 / 1024
        ));
    }

    fs::read(path).map_err(|error| error.to_string())
}

fn sanitize_inventory_name(name: &str) -> Result<String, String> {
    let sanitized = name
        .trim()
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            character if character.is_control() => '_',
            character => character,
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    let sanitized = sanitized.trim_matches('.').trim().to_string();

    if sanitized.is_empty() {
        return Err("Inventory name cannot be empty.".to_string());
    }

    Ok(sanitized)
}

fn sanitize_document_title(title: &str) -> Result<String, String> {
    sanitize_inventory_name(title)
}

fn unique_document_path(folder: &Path, title: &str, extension: &str) -> PathBuf {
    let mut candidate = folder.join(format!("{}.{}", title, extension));
    let mut suffix = 2;

    while candidate.exists() {
        candidate = folder.join(format!("{} {}.{}", title, suffix, extension));
        suffix += 1;
    }

    candidate
}

fn default_inventory_readme() -> String {
    inventory_manifest_readme("Inventory")
}

fn default_inventory_workspace_state() -> InventoryWorkspaceState {
    InventoryWorkspaceState {
        active_view: default_active_view(),
        left_pane_view: default_left_pane_view(),
        scene_mode: default_scene_mode(),
        selected_asset_id: None,
        selected_folder_id: None,
        tree_open_node_ids: default_tree_open_node_ids(),
        asset_sort_key: default_asset_sort_key(),
        asset_sort_direction: default_asset_sort_direction(),
        asset_view_mode: default_asset_view_mode(),
        details_column_widths: default_details_column_widths(),
        asset_search_query: String::new(),
        active_nvd_document_path: None,
        model_transform_overrides: BTreeMap::new(),
    }
}

fn default_inventory_documents_state() -> InventoryDocumentsState {
    InventoryDocumentsState {
        nvd_documents: Vec::new(),
        nvv_documents: Vec::new(),
    }
}

fn default_inventory_export_settings() -> InventoryExportSettings {
    InventoryExportSettings {
        conflict_strategy: default_export_conflict_strategy(),
        preserve_empty_folders: false,
        last_export_root: None,
    }
}

fn default_export_conflict_strategy() -> String {
    "rename".to_string()
}

fn default_asset_analysis_status() -> String {
    "idle".to_string()
}

fn default_active_view() -> String {
    "all".to_string()
}

fn default_left_pane_view() -> String {
    "library".to_string()
}

fn default_scene_mode() -> String {
    "preview".to_string()
}

fn default_tree_open_node_ids() -> Vec<String> {
    vec!["library".to_string()]
}

fn default_asset_sort_key() -> String {
    "name".to_string()
}

fn default_asset_sort_direction() -> String {
    "asc".to_string()
}

fn default_asset_view_mode() -> String {
    "medium".to_string()
}

fn default_details_column_widths() -> serde_json::Value {
    serde_json::json!({})
}

fn empty_library_state() -> LibraryState {
    LibraryState {
        root_path: None,
        assets: Vec::new(),
        project_tag_groups: Vec::new(),
        recent_user_tag_ids: Vec::new(),
        source_folders: Vec::new(),
        virtual_folders: Vec::new(),
    }
}

fn inventory_manifest_from_wire(wire: InventoryManifestWire) -> InventoryManifest {
    let now = unix_now();
    let library_state = wire.library_state.unwrap_or_else(empty_library_state);
    let inventory_name = wire
        .inventory_name
        .clone()
        .or_else(|| {
            wire.inventory
                .as_ref()
                .map(|inventory| inventory.name.clone())
        })
        .unwrap_or_else(|| "Inventory".to_string());
    let created_at_unix = wire
        .created_at_unix
        .or_else(|| {
            wire.inventory
                .as_ref()
                .map(|inventory| inventory.created_at_unix)
        })
        .unwrap_or(now);
    let updated_at_unix = wire
        .updated_at_unix
        .or_else(|| {
            wire.inventory
                .as_ref()
                .map(|inventory| inventory.updated_at_unix)
        })
        .unwrap_or(created_at_unix);

    InventoryManifest {
        schema_version: INVENTORY_SCHEMA_VERSION,
        kind: INVENTORY_MANIFEST_KIND.to_string(),
        readme: wire
            .readme
            .unwrap_or_else(|| inventory_manifest_readme(&inventory_name)),
        inventory: wire.inventory.unwrap_or(InventoryIdentityState {
            name: inventory_name,
            created_at_unix,
            updated_at_unix,
        }),
        root_path: wire.root_path.or(library_state.root_path),
        source_folders: wire.source_folders.unwrap_or(library_state.source_folders),
        assets: wire.assets.unwrap_or(library_state.assets),
        library_tree: wire.library_tree.unwrap_or(library_state.virtual_folders),
        project_tag_groups: wire
            .project_tag_groups
            .unwrap_or(library_state.project_tag_groups),
        recent_user_tag_ids: wire
            .recent_user_tag_ids
            .unwrap_or(library_state.recent_user_tag_ids),
        workspace_state: wire
            .workspace_state
            .unwrap_or_else(default_inventory_workspace_state),
        documents: wire
            .documents
            .unwrap_or_else(default_inventory_documents_state),
        export_settings: wire
            .export_settings
            .unwrap_or_else(default_inventory_export_settings),
    }
}

fn inventory_manifest_readme(inventory_name: &str) -> String {
    format!(
        "{} is the project file for the \"{}\" Inventory.\n\nThis file stores the Inventory's library tree, source folder references, asset display names, notes, tags, Inventory-owned document registry, and other project state. It is JSON internally so the app can read it safely, but it is intended to be opened through Inventory.\n\nThe folders beside this file hold Inventory-owned documents, exports, thumbnails, and cache data.",
        INVENTORY_MANIFEST_FILENAME, inventory_name
    )
}

fn validate_inventory_manifest_path(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("Inventory file does not exist.".to_string());
    }

    if !path.is_file() {
        return Err("Selected Inventory is not a file.".to_string());
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("nvi") {
        return Err("Selected file is not an .nvi Inventory file.".to_string());
    }

    Ok(())
}

fn validate_nvd_document_path(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("NVD document does not exist.".to_string());
    }

    if !path.is_file() {
        return Err("Selected NVD document is not a file.".to_string());
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("nvd") {
        return Err("Selected file is not an .nvd document.".to_string());
    }

    Ok(())
}

fn validate_nvv_document_path(path: &Path) -> Result<(), String> {
    if !path.is_file()
        || !path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("nvv"))
    {
        return Err("Selected file is not an .nvv vector document.".to_string());
    }
    Ok(())
}

fn read_inventory_manifest(path: &Path) -> Result<InventoryManifest, String> {
    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let wire = serde_json::from_str::<InventoryManifestWire>(&contents)
        .map_err(|error| error.to_string())?;

    if wire.schema_version == 0 || wire.schema_version > INVENTORY_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported Inventory schema version {}.",
            wire.schema_version
        ));
    }

    if wire.kind != INVENTORY_MANIFEST_KIND {
        return Err("Selected file is not an Inventory manifest.".to_string());
    }

    Ok(inventory_manifest_from_wire(wire))
}

fn read_nvd_document(path: &Path) -> Result<NvdDocument, String> {
    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let document =
        serde_json::from_str::<NvdDocument>(&contents).map_err(|error| error.to_string())?;

    if document.schema_version == 0 || document.schema_version > NVD_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported NVD schema version {}.",
            document.schema_version
        ));
    }

    if document.kind != NVD_DOCUMENT_KIND {
        return Err("Selected file is not an Inventory NVD document.".to_string());
    }

    Ok(normalize_nvd_document(document))
}

fn write_inventory_manifest(path: &Path, manifest: &InventoryManifest) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(manifest).map_err(|error| error.to_string())?;
    atomic_write(path, contents.as_bytes())
}

fn write_nvd_document(path: &Path, document: &NvdDocument) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(document).map_err(|error| error.to_string())?;
    atomic_write(path, contents.as_bytes())
}

fn read_nvv_document(path: &Path) -> Result<NvvDocument, String> {
    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let document =
        serde_json::from_str::<NvvDocument>(&contents).map_err(|error| error.to_string())?;
    if document.schema_version != NVV_SCHEMA_VERSION || document.kind != NVV_DOCUMENT_KIND {
        return Err("Selected file is not a supported Inventory vector document.".to_string());
    }
    Ok(document)
}

fn write_nvv_document(path: &Path, document: &NvvDocument) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(document).map_err(|error| error.to_string())?;
    atomic_write(path, contents.as_bytes())
}

fn nvv_document_has_removed_shape_data(path: &Path) -> bool {
    fs::read_to_string(path)
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .is_some_and(|value| value.get("shapes").is_some())
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Cannot save a file without a parent folder.".to_string())?;
    let file_name = path
        .file_name()
        .ok_or_else(|| "Cannot save a file without a file name.".to_string())?
        .to_string_lossy();
    let unique_suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let temporary_path = parent.join(format!(
        ".{file_name}.{}.{}.tmp",
        std::process::id(),
        unique_suffix
    ));
    let result = (|| {
        let mut temporary_file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary_path)
            .map_err(|error| error.to_string())?;
        temporary_file
            .write_all(contents)
            .map_err(|error| error.to_string())?;
        temporary_file
            .sync_all()
            .map_err(|error| error.to_string())?;
        drop(temporary_file);

        replace_file(&temporary_path, path)
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }

    result
}

#[cfg(not(windows))]
fn replace_file(temporary_path: &Path, destination_path: &Path) -> Result<(), String> {
    fs::rename(temporary_path, destination_path).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn replace_file(temporary_path: &Path, destination_path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::ReplaceFileW;

    if !destination_path.exists() {
        return fs::rename(temporary_path, destination_path).map_err(|error| error.to_string());
    }

    let destination = destination_path
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let temporary = temporary_path
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let replaced = unsafe {
        ReplaceFileW(
            destination.as_ptr(),
            temporary.as_ptr(),
            std::ptr::null(),
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };

    if replaced == 0 {
        Err(std::io::Error::last_os_error().to_string())
    } else {
        Ok(())
    }
}

fn default_nvd_font_family() -> String {
    NVD_DEFAULT_FONT_FAMILY.to_string()
}

fn normalize_nvd_font_family(font_family: &str) -> String {
    let trimmed_family = font_family.trim();

    if trimmed_family.is_empty() {
        default_nvd_font_family()
    } else {
        trimmed_family.to_string()
    }
}

fn default_nvd_font_size() -> String {
    NVD_DEFAULT_FONT_SIZE.to_string()
}

fn normalize_nvd_font_size(font_size: &str) -> String {
    let normalized_size = font_size.trim().to_ascii_lowercase();
    let (numeric_size, pixel_value) = if let Some(value) = normalized_size.strip_suffix("px") {
        (value, true)
    } else if let Some(value) = normalized_size.strip_suffix("pt") {
        (value, false)
    } else {
        (normalized_size.as_str(), false)
    };

    let Ok(mut size_pt) = numeric_size.trim().parse::<f64>() else {
        return default_nvd_font_size();
    };

    if !size_pt.is_finite() {
        return default_nvd_font_size();
    }

    if pixel_value {
        size_pt *= 0.75;
    }

    let clamped_size_pt = size_pt
        .round()
        .clamp(NVD_MIN_FONT_SIZE_PT, NVD_MAX_FONT_SIZE_PT);
    format!("{clamped_size_pt:.0}pt")
}

fn default_nvd_layout_mode() -> String {
    NVD_LAYOUT_MODE_A4.to_string()
}

fn normalize_nvd_layout_mode(layout_mode: &str) -> String {
    match layout_mode {
        NVD_LAYOUT_MODE_A4 => NVD_LAYOUT_MODE_A4.to_string(),
        _ => default_nvd_layout_mode(),
    }
}

fn normalize_nvd_document(mut document: NvdDocument) -> NvdDocument {
    document.schema_version = NVD_SCHEMA_VERSION;
    document.kind = NVD_DOCUMENT_KIND.to_string();
    document.font_family = normalize_nvd_font_family(&document.font_family);
    document.font_size = normalize_nvd_font_size(&document.font_size);
    document.layout_mode = normalize_nvd_layout_mode(&document.layout_mode);
    document.page_layout = normalize_nvd_page_layout(&document.page_layout);
    document.blocks = document
        .blocks
        .into_iter()
        .map(normalize_nvd_block)
        .collect();
    document.page_objects = document
        .page_objects
        .into_iter()
        .map(normalize_nvd_page_object)
        .collect();
    document.styles = document
        .styles
        .into_iter()
        .map(|(role, style)| (role, normalize_nvd_style_definition(style)))
        .collect();
    document
}

fn normalize_nvd_block(mut block: NvdBlock) -> NvdBlock {
    if block.kind.trim().eq_ignore_ascii_case("embed") || block.embed.is_some() {
        block.kind = "embed".to_string();
        block.embed = block.embed.map(normalize_nvd_asset_embed);
        return block;
    }

    block.kind = normalize_nvd_text_block_kind(&block.kind);
    block
}

fn normalize_nvd_text_block_kind(kind: &str) -> String {
    match kind.trim() {
        "paragraph" => "p".to_string(),
        "heading" => "h1".to_string(),
        "p" | "h1" | "h2" | "h3" => kind.trim().to_string(),
        "" => "p".to_string(),
        other => other.to_string(),
    }
}

fn normalize_nvd_style_definition(mut style: NvdStyleDefinition) -> NvdStyleDefinition {
    style.font_family = normalize_nvd_font_family(&style.font_family);
    style.font_size_pt = style.font_size_pt.clamp(6.0, 144.0);
    style.orphan_line_count = normalize_nvd_line_constraint(style.orphan_line_count);
    style.widow_line_count = normalize_nvd_line_constraint(style.widow_line_count);
    style
}

fn normalize_nvd_asset_embed(mut embed: NvdAssetEmbed) -> NvdAssetEmbed {
    let trimmed_kind = embed.asset_kind.trim();
    embed.asset_kind = if trimmed_kind.is_empty() {
        "image".to_string()
    } else {
        trimmed_kind.to_string()
    };

    let trimmed_path = embed.asset_path.trim().to_string();
    embed.asset_path = trimmed_path.clone();

    let trimmed_name = embed.asset_name.trim();
    embed.asset_name = if trimmed_name.is_empty() {
        Path::new(&trimmed_path)
            .file_name()
            .and_then(|value| value.to_str())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("Embedded Asset")
            .to_string()
    } else {
        trimmed_name.to_string()
    };

    embed.alignment = Some(normalize_nvd_embed_alignment(embed.alignment.as_deref()));
    embed.caption = normalize_nvd_optional_trimmed_string(embed.caption);
    embed.display_mode = Some(normalize_nvd_embed_display_mode(
        embed.display_mode.as_deref(),
    ));
    embed.height_px = normalize_nvd_embed_extent_px(embed.height_px);
    embed.source_document_kind = normalize_nvd_optional_trimmed_string(embed.source_document_kind)
        .map(|kind| kind.to_lowercase());
    embed.width_px = normalize_nvd_embed_extent_px(embed.width_px);
    embed
}

fn normalize_nvd_page_object(mut page_object: NvdPageObject) -> NvdPageObject {
    page_object.id = normalize_nvd_page_object_id(page_object.id);
    page_object.kind = normalize_nvd_page_object_kind(&page_object.kind);
    page_object.x_px = normalize_nvd_page_object_coordinate_px(page_object.x_px);
    page_object.y_px = normalize_nvd_page_object_coordinate_px(page_object.y_px);
    page_object.width_px = normalize_nvd_page_object_extent_px(page_object.width_px);
    page_object.height_px = normalize_nvd_page_object_extent_px(page_object.height_px);
    page_object.rotation_deg = Some(normalize_nvd_page_object_rotation_deg(
        page_object.rotation_deg,
    ));
    page_object.wrap_mode = Some(normalize_nvd_page_object_wrap_mode(
        page_object.wrap_mode.as_deref(),
    ));
    page_object.z_mode = Some(normalize_nvd_page_object_z_mode(
        page_object.z_mode.as_deref(),
    ));
    page_object.wrap_padding_px = normalize_nvd_page_object_padding_px(page_object.wrap_padding_px);
    page_object.asset = page_object.asset.map(normalize_nvd_page_object_asset);
    page_object
}

fn normalize_nvd_page_object_asset(mut asset: NvdPageObjectAsset) -> NvdPageObjectAsset {
    let trimmed_kind = asset.asset_kind.trim();
    asset.asset_kind = if trimmed_kind.is_empty() {
        "image".to_string()
    } else {
        trimmed_kind.to_string()
    };

    let trimmed_path = asset.asset_path.trim().to_string();
    asset.asset_path = trimmed_path.clone();

    let trimmed_name = asset.asset_name.trim();
    asset.asset_name = if trimmed_name.is_empty() {
        Path::new(&trimmed_path)
            .file_name()
            .and_then(|value| value.to_str())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("Placed Asset")
            .to_string()
    } else {
        trimmed_name.to_string()
    };

    asset.source_document_kind = normalize_nvd_optional_trimmed_string(asset.source_document_kind)
        .map(|kind| kind.to_lowercase());
    asset
}

fn normalize_nvd_embed_alignment(alignment: Option<&str>) -> String {
    match alignment.map(str::trim) {
        Some("left") => "left".to_string(),
        Some("right") => "right".to_string(),
        Some("center") => "center".to_string(),
        _ => NVD_DEFAULT_EMBED_ALIGNMENT.to_string(),
    }
}

fn normalize_nvd_embed_display_mode(display_mode: Option<&str>) -> String {
    match display_mode.map(str::trim) {
        Some("actual") => "actual".to_string(),
        Some("custom") => "custom".to_string(),
        Some("fit") => "fit".to_string(),
        _ => NVD_DEFAULT_EMBED_DISPLAY_MODE.to_string(),
    }
}

fn normalize_nvd_embed_extent_px(value: Option<f64>) -> Option<f64> {
    value.filter(|extent| extent.is_finite() && *extent > 0.0)
}

fn default_nvd_page_object_extent_px() -> f64 {
    1.0
}

fn normalize_nvd_page_object_id(id: String) -> String {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        format!("object-{}", unix_now())
    } else {
        trimmed.to_string()
    }
}

fn normalize_nvd_page_object_kind(kind: &str) -> String {
    match kind.trim() {
        "" => "asset-frame".to_string(),
        other => other.to_string(),
    }
}

fn normalize_nvd_page_object_wrap_mode(wrap_mode: Option<&str>) -> String {
    match wrap_mode.map(str::trim) {
        Some("rectangle") => "rectangle".to_string(),
        _ => "none".to_string(),
    }
}

fn normalize_nvd_page_object_z_mode(z_mode: Option<&str>) -> String {
    match z_mode.map(str::trim) {
        Some("behind-text") => "behind-text".to_string(),
        _ => "in-front-of-text".to_string(),
    }
}

fn normalize_nvd_page_object_coordinate_px(value: f64) -> f64 {
    if value.is_finite() && value >= 0.0 {
        value.floor()
    } else {
        0.0
    }
}

fn normalize_nvd_page_object_extent_px(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value.floor().max(1.0)
    } else {
        default_nvd_page_object_extent_px()
    }
}

fn normalize_nvd_page_object_padding_px(value: Option<f64>) -> Option<f64> {
    value.and_then(|padding| {
        if padding.is_finite() && padding >= 0.0 {
            Some(padding.floor())
        } else {
            None
        }
    })
}

fn normalize_nvd_page_object_rotation_deg(value: Option<f64>) -> f64 {
    let rotation_deg = value.filter(|value| value.is_finite()).unwrap_or(0.0);
    let normalized_rotation = ((rotation_deg % 360.0) + 360.0) % 360.0;

    if normalized_rotation > 180.0 {
        normalized_rotation - 360.0
    } else {
        normalized_rotation
    }
}

fn normalize_nvd_line_constraint(value: Option<u32>) -> Option<u32> {
    value.and_then(|count| if count > 2 { Some(count) } else { None })
}

fn normalize_nvd_optional_trimmed_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn default_nvd_page_layout() -> NvdPageLayout {
    NvdPageLayout {
        page_size: NVD_PAGE_SIZE_A4.to_string(),
        width_pt: NVD_A4_PAGE_WIDTH_PT,
        height_pt: NVD_A4_PAGE_HEIGHT_PT,
        margin_top_pt: NVD_DEFAULT_PAGE_MARGIN_PT,
        margin_right_pt: NVD_DEFAULT_PAGE_MARGIN_PT,
        margin_bottom_pt: NVD_DEFAULT_PAGE_MARGIN_PT,
        margin_left_pt: NVD_DEFAULT_PAGE_MARGIN_PT,
    }
}

fn normalize_nvd_page_layout(page_layout: &NvdPageLayout) -> NvdPageLayout {
    let page_size = match page_layout.page_size.as_str() {
        NVD_PAGE_SIZE_CUSTOM => NVD_PAGE_SIZE_CUSTOM.to_string(),
        _ => NVD_PAGE_SIZE_A4.to_string(),
    };
    let fallback = default_nvd_page_layout();
    let width_pt = normalize_nvd_page_extent_pt(page_layout.width_pt, fallback.width_pt);
    let height_pt = normalize_nvd_page_extent_pt(page_layout.height_pt, fallback.height_pt);
    let margin_top_pt =
        normalize_nvd_page_margin_pt(page_layout.margin_top_pt, fallback.margin_top_pt);
    let margin_right_pt =
        normalize_nvd_page_margin_pt(page_layout.margin_right_pt, fallback.margin_right_pt);
    let margin_bottom_pt =
        normalize_nvd_page_margin_pt(page_layout.margin_bottom_pt, fallback.margin_bottom_pt);
    let margin_left_pt =
        normalize_nvd_page_margin_pt(page_layout.margin_left_pt, fallback.margin_left_pt);
    let (margin_top_pt, margin_bottom_pt) =
        clamp_nvd_page_margin_pair(margin_top_pt, margin_bottom_pt, height_pt);
    let (margin_right_pt, margin_left_pt) =
        clamp_nvd_page_margin_pair(margin_right_pt, margin_left_pt, width_pt);

    NvdPageLayout {
        page_size,
        width_pt,
        height_pt,
        margin_top_pt,
        margin_right_pt,
        margin_bottom_pt,
        margin_left_pt,
    }
}

fn normalize_nvd_page_extent_pt(value: f64, fallback: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value
    } else {
        fallback
    }
}

fn normalize_nvd_page_margin_pt(value: f64, fallback: f64) -> f64 {
    if value.is_finite() && value >= 0.0 {
        value
    } else {
        fallback
    }
}

fn clamp_nvd_page_margin_pair(start: f64, end: f64, extent_pt: f64) -> (f64, f64) {
    let max_combined_margins = (extent_pt - NVD_MIN_PAGE_CONTENT_SIZE_PT).max(0.0);

    if start + end <= max_combined_margins {
        return (start, end);
    }

    if start == 0.0 && end == 0.0 {
        return (0.0, 0.0);
    }

    let scale = max_combined_margins / (start + end).max(1.0);
    (start * scale, end * scale)
}

fn open_inventory_from_parts(
    manifest_path: PathBuf,
    manifest: InventoryManifest,
) -> Result<OpenedInventory, String> {
    let root_path = manifest_path
        .parent()
        .unwrap_or_else(|| Path::new(""))
        .to_string_lossy()
        .to_string();

    Ok(OpenedInventory {
        manifest_path: manifest_path.to_string_lossy().to_string(),
        root_path,
        manifest,
    })
}

fn open_nvd_document_from_parts(
    document_path: PathBuf,
    document: NvdDocument,
) -> Result<OpenedNvdDocument, String> {
    let entry = inventory_document_entry_from_nvd(&document_path, &document);
    let asset = asset_record_from_nvd(&document_path, &document)?;

    Ok(OpenedNvdDocument {
        path: document_path.to_string_lossy().to_string(),
        document,
        entry,
        asset,
    })
}

fn open_nvv_document_from_parts(
    document_path: PathBuf,
    document: NvvDocument,
) -> Result<OpenedNvvDocument, String> {
    let path = document_path.to_string_lossy().to_string();
    let asset_id = stable_asset_id(&path);
    let metadata = fs::metadata(&document_path).map_err(|error| error.to_string())?;
    let entry = InventoryDocumentEntry {
        id: format!("nvv-{asset_id}"),
        asset_id,
        kind: document.kind.clone(),
        title: document.title.clone(),
        path: path.clone(),
        created_at_unix: document.created_at_unix,
        updated_at_unix: document.updated_at_unix,
    };
    let asset = AssetRecord {
        id: asset_id,
        name: document_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("Untitled.nvv")
            .to_string(),
        path: path.clone(),
        file_type: "Document".to_string(),
        extension: "nvv".to_string(),
        size_bytes: metadata.len(),
        modified_unix: Some(document.updated_at_unix),
        content_clues: Vec::new(),
        analysis_caption: String::new(),
        analysis_error: String::new(),
        analysis_file_signature: String::new(),
        analysis_status: default_asset_analysis_status(),
        analysis_suggested_tags: Vec::new(),
        analysis_version: 0,
        kept_tags: Vec::new(),
        notes: String::new(),
        tags: Vec::new(),
    };
    Ok(OpenedNvvDocument {
        path,
        document,
        entry,
        asset,
    })
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_inventory,
            create_nvd_document,
            create_nvv_document,
            delete_nvd_document,
            load_library_state,
            open_nvd_document,
            open_nvv_document,
            open_inventory,
            read_file_bytes,
            rename_nvd_document,
            save_inventory,
            save_library_state,
            save_nvd_document,
            save_nvv_document,
            scan_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Inventory");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn atomically_creates_and_replaces_nvd_file_contents() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let test_dir = std::env::temp_dir().join(format!(
            "inventory-atomic-nvd-write-test-{}-{unique_suffix}",
            std::process::id()
        ));
        let document_path = test_dir.join("Notes.nvd");
        fs::create_dir_all(&test_dir).expect("atomic write test folder should be created");

        atomic_write(&document_path, b"first version").expect("new NVD file should be created");
        assert_eq!(
            fs::read_to_string(&document_path).expect("created NVD file should be readable"),
            "first version"
        );

        atomic_write(&document_path, b"complete replacement")
            .expect("existing NVD file should be atomically replaced");
        assert_eq!(
            fs::read_to_string(&document_path).expect("replaced NVD file should be readable"),
            "complete replacement"
        );
        assert_eq!(
            fs::read_dir(&test_dir)
                .expect("atomic write test folder should be readable")
                .count(),
            1,
            "atomic write should not leave a sibling temporary file"
        );

        let _ = fs::remove_dir_all(test_dir);
    }

    #[test]
    fn defaults_older_nvd_documents_to_current_presentation_defaults() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let document_path = std::env::temp_dir().join(format!(
            "inventory-old-nvd-layout-test-{}-{unique_suffix}.nvd",
            std::process::id()
        ));
        let contents = serde_json::json!({
            "schemaVersion": 1,
            "kind": NVD_DOCUMENT_KIND,
            "title": "Older Document",
            "createdAtUnix": 10,
            "updatedAtUnix": 20,
            "blocks": []
        });
        fs::write(
            &document_path,
            serde_json::to_string_pretty(&contents).expect("old NVD document should serialize"),
        )
        .expect("old NVD document should be written");

        let document = read_nvd_document(&document_path).expect("old NVD document should open");

        assert_eq!(document.font_family, NVD_DEFAULT_FONT_FAMILY);
        assert_eq!(document.font_size, NVD_DEFAULT_FONT_SIZE);
        assert_eq!(document.layout_mode, NVD_LAYOUT_MODE_A4);
        assert_eq!(document.schema_version, NVD_SCHEMA_VERSION);
        assert_eq!(document.page_layout.page_size, NVD_PAGE_SIZE_A4);
        assert_eq!(
            document.page_layout.margin_left_pt,
            NVD_DEFAULT_PAGE_MARGIN_PT
        );
        assert!(document.styles.is_empty());
        let _ = fs::remove_file(document_path);
    }

    #[test]
    fn normalizes_removed_pageless_layout_mode_to_a4() {
        assert_eq!(normalize_nvd_layout_mode("pageless"), "a4");
        assert_eq!(normalize_nvd_layout_mode("a4"), "a4");
        assert_eq!(normalize_nvd_layout_mode("invalid"), "a4");
    }

    #[test]
    fn normalizes_mixed_content_nvd_blocks_and_embed_defaults_on_read() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let document_path = std::env::temp_dir().join(format!(
            "inventory-mixed-content-nvd-test-{}-{unique_suffix}.nvd",
            std::process::id()
        ));
        let contents = serde_json::json!({
            "schemaVersion": 1,
            "kind": NVD_DOCUMENT_KIND,
            "title": "Mixed Document",
            "createdAtUnix": 10,
            "updatedAtUnix": 20,
            "fontFamily": " Inter ",
            "fontSize": "16pt",
            "layoutMode": "pageless",
            "blocks": [
                {
                    "id": "legacy-paragraph",
                    "kind": "paragraph",
                    "keepLinesTogether": true,
                    "keepWithNext": true,
                    "orphanLineCount": 3,
                    "spaceAfterPt": 12,
                    "spaceBeforePt": 6,
                    "text": "Intro",
                    "widowLineCount": 4
                },
                {
                    "id": "image-1",
                    "kind": "embed",
                    "text": "should be ignored later by UI",
                    "embed": {
                        "assetId": 12,
                        "assetKind": " ",
                        "assetName": " ",
                        "assetPath": " workspace/reference.png ",
                        "caption": "  Figure 1  ",
                        "displayMode": "invalid",
                        "heightPx": -1,
                        "sourceDocumentKind": " NVV ",
                        "widthPx": 480
                    }
                }
            ],
            "styles": {
                "h1": {
                    "bold": true,
                    "fontFamily": " Google Sans ",
                    "fontSizePt": 24,
                    "italic": false,
                    "keepLinesTogether": true,
                    "keepWithNext": true,
                    "label": "Heading 1",
                    "orphanLineCount": 2,
                    "role": "h1",
                    "textAlign": "left",
                    "widowLineCount": 4
                }
            }
        });
        fs::write(
            &document_path,
            serde_json::to_string_pretty(&contents).expect("mixed NVD document should serialize"),
        )
        .expect("mixed NVD document should be written");

        let document = read_nvd_document(&document_path).expect("mixed NVD document should open");

        assert_eq!(document.font_family, "Inter");
        assert_eq!(document.layout_mode, "a4");
        assert_eq!(document.blocks[0].kind, "p");
        assert_eq!(document.blocks[0].keep_lines_together, Some(true));
        assert_eq!(document.blocks[0].keep_with_next, Some(true));
        assert_eq!(document.blocks[0].orphan_line_count, Some(3));
        assert_eq!(document.blocks[0].widow_line_count, Some(4));
        assert_eq!(document.blocks[1].kind, "embed");
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .and_then(|embed| embed.alignment.as_deref()),
            Some("center")
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .and_then(|embed| embed.display_mode.as_deref()),
            Some("fit")
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .map(|embed| embed.asset_kind.as_str()),
            Some("image")
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .map(|embed| embed.asset_name.as_str()),
            Some("reference.png")
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .map(|embed| embed.asset_path.as_str()),
            Some("workspace/reference.png")
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .and_then(|embed| embed.caption.as_deref()),
            Some("Figure 1")
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .and_then(|embed| embed.height_px),
            None
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .and_then(|embed| embed.width_px),
            Some(480.0)
        );
        assert_eq!(
            document.blocks[1]
                .embed
                .as_ref()
                .and_then(|embed| embed.source_document_kind.as_deref()),
            Some("nvv")
        );
        assert_eq!(document.styles["h1"].keep_lines_together, Some(true));
        assert_eq!(document.styles["h1"].keep_with_next, Some(true));
        assert_eq!(document.styles["h1"].orphan_line_count, None);
        assert_eq!(document.styles["h1"].widow_line_count, Some(4));
        assert_eq!(document.styles["h1"].font_family, "Google Sans");

        let _ = fs::remove_file(document_path);
    }

    #[test]
    fn normalizes_invalid_nvd_page_layout_values_on_read() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let document_path = std::env::temp_dir().join(format!(
            "inventory-invalid-nvd-page-layout-test-{}-{unique_suffix}.nvd",
            std::process::id()
        ));
        let contents = serde_json::json!({
            "schemaVersion": NVD_SCHEMA_VERSION,
            "kind": NVD_DOCUMENT_KIND,
            "title": "Invalid Layout",
            "createdAtUnix": 10,
            "updatedAtUnix": 20,
            "blocks": [],
            "pageLayout": {
                "pageSize": "custom",
                "widthPt": -50,
                "heightPt": 0,
                "marginTopPt": 9999,
                "marginRightPt": -10,
                "marginBottomPt": 9999,
                "marginLeftPt": 9999
            }
        });
        fs::write(
            &document_path,
            serde_json::to_string_pretty(&contents).expect("invalid-layout NVD should serialize"),
        )
        .expect("invalid-layout NVD should be written");

        let document = read_nvd_document(&document_path).expect("invalid-layout NVD should open");

        assert_eq!(document.page_layout.page_size, NVD_PAGE_SIZE_CUSTOM);
        assert_eq!(document.page_layout.width_pt, NVD_A4_PAGE_WIDTH_PT);
        assert_eq!(document.page_layout.height_pt, NVD_A4_PAGE_HEIGHT_PT);
        assert!(document.page_layout.margin_right_pt >= 0.0);
        assert!(
            document.page_layout.margin_left_pt + document.page_layout.margin_right_pt
                <= document.page_layout.width_pt - NVD_MIN_PAGE_CONTENT_SIZE_PT + 0.0001
        );
        assert!(
            document.page_layout.margin_top_pt + document.page_layout.margin_bottom_pt
                <= document.page_layout.height_pt - NVD_MIN_PAGE_CONTENT_SIZE_PT + 0.0001
        );
        let _ = fs::remove_file(document_path);
    }

    #[test]
    fn preserves_nvd_page_objects_on_read() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let document_path = std::env::temp_dir().join(format!(
            "inventory-page-object-nvd-test-{}-{unique_suffix}.nvd",
            std::process::id()
        ));
        let contents = serde_json::json!({
            "schemaVersion": NVD_SCHEMA_VERSION,
            "kind": NVD_DOCUMENT_KIND,
            "title": "Placed Asset",
            "createdAtUnix": 10,
            "updatedAtUnix": 20,
            "blocks": [],
            "pageObjects": [
                {
                    "id": " frame-1 ",
                    "kind": "asset-frame",
                    "pageIndex": 0,
                    "xPx": 320.8,
                    "yPx": 140.2,
                    "widthPx": 300.9,
                    "heightPx": 240.1,
                    "rotationDeg": 372.4,
                    "wrapMode": "rectangle",
                    "zMode": "behind-text",
                    "wrapPaddingPx": 12.6,
                    "asset": {
                        "assetId": 42,
                        "assetKind": " ",
                        "assetName": " ",
                        "assetPath": " workspace/horse.jpg ",
                        "sourceDocumentKind": " NVV "
                    }
                }
            ]
        });
        fs::write(
            &document_path,
            serde_json::to_string_pretty(&contents).expect("page-object NVD should serialize"),
        )
        .expect("page-object NVD should be written");

        let document = read_nvd_document(&document_path).expect("page-object NVD should open");

        assert_eq!(document.page_objects.len(), 1);
        assert_eq!(document.page_objects[0].id, "frame-1");
        assert_eq!(document.page_objects[0].kind, "asset-frame");
        assert_eq!(document.page_objects[0].x_px, 320.0);
        assert_eq!(document.page_objects[0].y_px, 140.0);
        assert_eq!(document.page_objects[0].width_px, 300.0);
        assert_eq!(document.page_objects[0].height_px, 240.0);
        assert!(
            document.page_objects[0]
                .rotation_deg
                .map(|rotation| (rotation - 12.4).abs() < 0.001)
                .unwrap_or(false)
        );
        assert_eq!(
            document.page_objects[0].wrap_mode.as_deref(),
            Some("rectangle")
        );
        assert_eq!(
            document.page_objects[0].z_mode.as_deref(),
            Some("behind-text")
        );
        assert_eq!(document.page_objects[0].wrap_padding_px, Some(12.0));
        assert_eq!(
            document.page_objects[0]
                .asset
                .as_ref()
                .map(|asset| asset.asset_kind.as_str()),
            Some("image")
        );
        assert_eq!(
            document.page_objects[0]
                .asset
                .as_ref()
                .map(|asset| asset.asset_name.as_str()),
            Some("horse.jpg")
        );
        assert_eq!(
            document.page_objects[0]
                .asset
                .as_ref()
                .map(|asset| asset.asset_path.as_str()),
            Some("workspace/horse.jpg")
        );
        assert_eq!(
            document.page_objects[0]
                .asset
                .as_ref()
                .and_then(|asset| asset.source_document_kind.as_deref()),
            Some("nvv")
        );

        write_nvd_document(&document_path, &document)
            .expect("page-object NVD should be writable after normalization");
        let written_contents = fs::read_to_string(&document_path)
            .expect("page-object NVD should still be readable from disk");
        assert!(written_contents.contains("pageObjects"));
        let reopened_document =
            read_nvd_document(&document_path).expect("page-object NVD should reopen after write");
        assert_eq!(reopened_document.page_objects.len(), 1);
        assert!(
            reopened_document.page_objects[0]
                .rotation_deg
                .map(|rotation| (rotation - 12.4).abs() < 0.001)
                .unwrap_or(false)
        );
        assert_eq!(
            reopened_document.page_objects[0]
                .asset
                .as_ref()
                .map(|asset| asset.asset_name.as_str()),
            Some("horse.jpg")
        );

        let _ = fs::remove_file(document_path);
    }

    #[test]
    fn preserves_nvd_document_style_definitions() {
        let document = serde_json::from_value::<NvdDocument>(serde_json::json!({
            "schemaVersion": NVD_SCHEMA_VERSION,
            "kind": NVD_DOCUMENT_KIND,
            "title": "Styled Document",
            "createdAtUnix": 10,
            "updatedAtUnix": 20,
            "blocks": [],
            "styles": {
                "h1": {
                    "bold": false,
                    "characterSpacingPt": 2.5,
                    "fontFamily": "Caveat",
                    "fontSizePt": 42,
                    "italic": true,
                    "label": "Hero",
                    "role": "h1",
                    "textAlign": "center"
                }
            }
        }))
        .expect("styled NVD document should deserialize");

        let serialized =
            serde_json::to_value(document).expect("styled NVD document should serialize");

        assert_eq!(serialized["styles"]["h1"]["fontFamily"], "Caveat");
        assert_eq!(
            serialized["styles"]["h1"]["characterSpacingPt"].as_f64(),
            Some(2.5)
        );
        assert_eq!(
            serialized["styles"]["h1"]["fontSizePt"].as_f64(),
            Some(42.0)
        );
        assert_eq!(serialized["styles"]["h1"]["textAlign"], "center");
        assert!(
            serialized["styles"]["h1"].get("lineHeight").is_none(),
            "missing style values should remain absent for role-specific frontend defaults"
        );
        assert!(
            serialized["styles"]["h1"].get("spaceAfterPt").is_none(),
            "missing style values should remain absent for role-specific frontend defaults"
        );
        assert!(
            serialized["styles"]["h1"].get("spaceBeforePt").is_none(),
            "missing style values should remain absent for role-specific frontend defaults"
        );
    }

    #[test]
    fn normalizes_nvd_font_sizes_to_safe_point_values() {
        assert_eq!(normalize_nvd_font_size("16px"), "12pt");
        assert_eq!(normalize_nvd_font_size("24"), "24pt");
        assert_eq!(normalize_nvd_font_size("5pt"), "6pt");
        assert_eq!(normalize_nvd_font_size("200pt"), "144pt");
        assert_eq!(normalize_nvd_font_size("not-a-size"), NVD_DEFAULT_FONT_SIZE);
    }

    #[test]
    fn migrates_v1_inventory_manifest_into_v2_sections() {
        let wire = serde_json::from_value::<InventoryManifestWire>(serde_json::json!({
            "schemaVersion": 1,
            "kind": INVENTORY_MANIFEST_KIND,
            "inventoryName": "Old Inventory",
            "createdAtUnix": 10,
            "updatedAtUnix": 20,
            "libraryState": {
                "rootPath": "C:\\Assets",
                "assets": [],
                "sourceFolders": [],
                "virtualFolders": []
            },
            "workspaceState": {
                "activeView": "all",
                "sceneMode": "preview",
                "selectedAssetId": null,
                "selectedFolderId": null,
                "treeOpenNodeIds": ["library"],
                "assetSortKey": "name",
                "assetSortDirection": "asc",
                "assetViewMode": "medium",
                "detailsColumnWidths": {}
            }
        }))
        .expect("v1 wire manifest should deserialize");

        let manifest = inventory_manifest_from_wire(wire);

        assert_eq!(manifest.schema_version, INVENTORY_SCHEMA_VERSION);
        assert_eq!(manifest.inventory.name, "Old Inventory");
        assert_eq!(manifest.root_path.as_deref(), Some("C:\\Assets"));
        assert!(manifest.source_folders.is_empty());
        assert!(manifest.assets.is_empty());
        assert!(manifest.library_tree.is_empty());
        assert_eq!(manifest.workspace_state.asset_search_query, "");
        assert!(manifest.workspace_state.active_nvd_document_path.is_none());
        assert!(manifest
            .workspace_state
            .model_transform_overrides
            .is_empty());
    }

    #[test]
    fn serializes_v2_inventory_manifest_with_explicit_sections() {
        let document_entry = InventoryDocumentEntry {
            id: "nvd-42".to_string(),
            asset_id: 42,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Notes".to_string(),
            path: "C:\\Inventory\\documents\\Notes.nvd".to_string(),
            created_at_unix: 10,
            updated_at_unix: 20,
        };
        let manifest = InventoryManifest {
            schema_version: INVENTORY_SCHEMA_VERSION,
            kind: INVENTORY_MANIFEST_KIND.to_string(),
            readme: inventory_manifest_readme("Test"),
            inventory: InventoryIdentityState {
                name: "Test".to_string(),
                created_at_unix: 10,
                updated_at_unix: 20,
            },
            root_path: None,
            source_folders: Vec::new(),
            assets: Vec::new(),
            library_tree: Vec::new(),
            project_tag_groups: Vec::new(),
            recent_user_tag_ids: Vec::new(),
            workspace_state: default_inventory_workspace_state(),
            documents: InventoryDocumentsState {
                nvd_documents: vec![document_entry],
                nvv_documents: Vec::new(),
            },
            export_settings: default_inventory_export_settings(),
        };

        let value = serde_json::to_value(manifest).expect("v2 manifest should serialize");

        for key in [
            "inventory",
            "rootPath",
            "sourceFolders",
            "assets",
            "libraryTree",
            "workspaceState",
            "documents",
            "exportSettings",
        ] {
            assert!(
                value.get(key).is_some(),
                "missing v2 manifest section: {key}"
            );
        }

        let workspace_state = value
            .get("workspaceState")
            .expect("workspaceState should be present");

        for key in [
            "leftPaneView",
            "assetSearchQuery",
            "activeNvdDocumentPath",
            "modelTransformOverrides",
        ] {
            assert!(
                workspace_state.get(key).is_some(),
                "missing workspace memory field: {key}"
            );
        }

        assert_eq!(value["documents"]["nvdDocuments"][0]["assetId"], 42);
    }

    #[test]
    fn atomically_replaces_inventory_manifest_contents() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let test_dir = std::env::temp_dir().join(format!(
            "inventory-atomic-manifest-write-test-{}-{unique_suffix}",
            std::process::id()
        ));
        let manifest_path = test_dir.join(INVENTORY_MANIFEST_FILENAME);
        fs::create_dir_all(&test_dir).expect("atomic manifest test folder should be created");

        let mut manifest = InventoryManifest {
            schema_version: INVENTORY_SCHEMA_VERSION,
            kind: INVENTORY_MANIFEST_KIND.to_string(),
            readme: inventory_manifest_readme("First"),
            inventory: InventoryIdentityState {
                name: "First".to_string(),
                created_at_unix: 10,
                updated_at_unix: 20,
            },
            root_path: None,
            source_folders: Vec::new(),
            assets: Vec::new(),
            library_tree: Vec::new(),
            project_tag_groups: Vec::new(),
            recent_user_tag_ids: Vec::new(),
            workspace_state: default_inventory_workspace_state(),
            documents: InventoryDocumentsState {
                nvd_documents: Vec::new(),
                nvv_documents: Vec::new(),
            },
            export_settings: default_inventory_export_settings(),
        };
        write_inventory_manifest(&manifest_path, &manifest)
            .expect("new Inventory manifest should be created");
        manifest.inventory.name = "Replacement".to_string();
        write_inventory_manifest(&manifest_path, &manifest)
            .expect("existing Inventory manifest should be atomically replaced");

        let saved_manifest =
            read_inventory_manifest(&manifest_path).expect("saved Inventory manifest should open");
        assert_eq!(saved_manifest.inventory.name, "Replacement");
        assert_eq!(
            fs::read_dir(&test_dir)
                .expect("atomic manifest test folder should be readable")
                .count(),
            1,
            "atomic manifest save should not leave a sibling temporary file"
        );

        let _ = fs::remove_dir_all(test_dir);
    }

    #[test]
    fn upserts_inventory_document_entries_by_path() {
        let mut entries = vec![InventoryDocumentEntry {
            id: "nvd-1".to_string(),
            asset_id: 1,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Old Title".to_string(),
            path: "C:\\Inventory\\documents\\Notes.nvd".to_string(),
            created_at_unix: 10,
            updated_at_unix: 10,
        }];
        let replacement = InventoryDocumentEntry {
            id: "nvd-1".to_string(),
            asset_id: 1,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Notes".to_string(),
            path: "c:\\inventory\\documents\\notes.nvd".to_string(),
            created_at_unix: 10,
            updated_at_unix: 20,
        };
        let alphabetically_first = InventoryDocumentEntry {
            id: "nvd-2".to_string(),
            asset_id: 2,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Ideas".to_string(),
            path: "C:\\Inventory\\documents\\Ideas.nvd".to_string(),
            created_at_unix: 10,
            updated_at_unix: 10,
        };

        upsert_inventory_document_entry(&mut entries, &replacement);
        upsert_inventory_document_entry(&mut entries, &alphabetically_first);

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].title, "Ideas");
        assert_eq!(entries[1].title, "Notes");
        assert_eq!(entries[1].updated_at_unix, 20);
    }

    #[test]
    fn save_inventory_preserves_manifest_identity() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let inventory_root = std::env::temp_dir().join(format!(
            "inventory-save-identity-test-{}-{unique_suffix}",
            std::process::id()
        ));
        let manifest_path = inventory_root.join(INVENTORY_MANIFEST_FILENAME);
        fs::create_dir_all(&inventory_root).expect("test Inventory should be created");

        let manifest = InventoryManifest {
            schema_version: INVENTORY_SCHEMA_VERSION,
            kind: INVENTORY_MANIFEST_KIND.to_string(),
            readme: inventory_manifest_readme("Nick"),
            inventory: InventoryIdentityState {
                name: "Nick".to_string(),
                created_at_unix: 10,
                updated_at_unix: 20,
            },
            root_path: None,
            source_folders: Vec::new(),
            assets: Vec::new(),
            library_tree: Vec::new(),
            project_tag_groups: Vec::new(),
            recent_user_tag_ids: Vec::new(),
            workspace_state: default_inventory_workspace_state(),
            documents: default_inventory_documents_state(),
            export_settings: default_inventory_export_settings(),
        };
        write_inventory_manifest(&manifest_path, &manifest)
            .expect("test Inventory manifest should be written");

        save_inventory(
            manifest_path.to_string_lossy().to_string(),
            empty_library_state(),
            default_inventory_workspace_state(),
        )
        .expect("Inventory should save");

        let saved_manifest =
            read_inventory_manifest(&manifest_path).expect("saved Inventory should be readable");
        assert_eq!(saved_manifest.inventory.name, "Nick");
        assert_eq!(saved_manifest.inventory.created_at_unix, 10);
        assert_eq!(saved_manifest.readme, inventory_manifest_readme("Nick"));

        fs::remove_dir_all(&inventory_root).expect("test Inventory should be removed");
    }

    #[test]
    fn renames_and_deletes_inventory_owned_nvd_documents() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let inventory_root = std::env::temp_dir().join(format!(
            "inventory-document-management-test-{}-{unique_suffix}",
            std::process::id()
        ));
        let documents_dir = inventory_root.join("documents");
        let manifest_path = inventory_root.join(INVENTORY_MANIFEST_FILENAME);
        let original_document_path = documents_dir.join("Draft.nvd");
        fs::create_dir_all(&documents_dir).expect("documents directory should be created");

        let document = NvdDocument {
            schema_version: NVD_SCHEMA_VERSION,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Draft".to_string(),
            created_at_unix: 10,
            updated_at_unix: 20,
            font_family: "Google Sans".to_string(),
            font_size: "24pt".to_string(),
            layout_mode: default_nvd_layout_mode(),
            page_layout: default_nvd_page_layout(),
            blocks: vec![
                NvdBlock {
                    id: "block-1".to_string(),
                    kind: "paragraph".to_string(),
                    keep_lines_together: Some(true),
                    keep_with_next: Some(true),
                    line_height: Some(2.25),
                    orphan_line_count: Some(3),
                    space_after_pt: Some(18.0),
                    space_before_pt: Some(6.0),
                    text: "Original content".to_string(),
                    runs: vec![NvdTextRun {
                        text: "Original content".to_string(),
                        style: Some(NvdTextStyle {
                            bold: Some(true),
                            character_spacing_pt: Some(1.5),
                            font_family: Some("Google Sans".to_string()),
                            font_size: Some("18pt".to_string()),
                            italic: Some(true),
                        }),
                    }],
                    text_align: Some("center".to_string()),
                    embed: None,
                    widow_line_count: Some(4),
                },
                NvdBlock {
                    id: "block-2".to_string(),
                    kind: "paragraph".to_string(),
                    keep_lines_together: None,
                    keep_with_next: None,
                    line_height: None,
                    orphan_line_count: None,
                    space_after_pt: None,
                    space_before_pt: None,
                    text: "Second paragraph".to_string(),
                    runs: Vec::new(),
                    text_align: None,
                    embed: None,
                    widow_line_count: None,
                },
            ],
            page_objects: Vec::new(),
            styles: BTreeMap::new(),
        };
        write_nvd_document(&original_document_path, &document)
            .expect("test NVD document should be written");
        let original_entry = inventory_document_entry_from_nvd(&original_document_path, &document);
        let mut original_asset = asset_record_from_nvd(&original_document_path, &document)
            .expect("asset metadata should be created");
        original_asset.notes = "Keep this note".to_string();
        original_asset.tags = vec!["draft".to_string()];
        original_asset.kept_tags = vec!["nvd".to_string()];

        let manifest = InventoryManifest {
            schema_version: INVENTORY_SCHEMA_VERSION,
            kind: INVENTORY_MANIFEST_KIND.to_string(),
            readme: inventory_manifest_readme("Test"),
            inventory: InventoryIdentityState {
                name: "Test".to_string(),
                created_at_unix: 10,
                updated_at_unix: 20,
            },
            root_path: None,
            source_folders: Vec::new(),
            assets: vec![original_asset],
            library_tree: vec![VirtualFolderState {
                id: "notes".to_string(),
                name: "Notes".to_string(),
                asset_ids: vec![original_entry.asset_id],
                children: Vec::new(),
                disk_path: None,
                is_planned_on_disk: false,
                path_segment: "notes".to_string(),
                rules: Vec::new(),
                suggested_tags: Vec::new(),
                tags: Vec::new(),
                template_id: None,
            }],
            project_tag_groups: Vec::new(),
            recent_user_tag_ids: Vec::new(),
            workspace_state: InventoryWorkspaceState {
                selected_asset_id: Some(original_entry.asset_id),
                active_nvd_document_path: Some(original_entry.path.clone()),
                ..default_inventory_workspace_state()
            },
            documents: InventoryDocumentsState {
                nvd_documents: vec![original_entry.clone()],
                nvv_documents: Vec::new(),
            },
            export_settings: default_inventory_export_settings(),
        };
        write_inventory_manifest(&manifest_path, &manifest)
            .expect("test Inventory manifest should be written");

        let renamed_document = rename_nvd_document(
            manifest_path.to_string_lossy().to_string(),
            original_entry.path.clone(),
            "Final Notes".to_string(),
            None,
        )
        .expect("Inventory-owned NVD document should rename");
        let renamed_path = PathBuf::from(&renamed_document.path);
        assert!(!original_document_path.exists());
        assert!(renamed_path.exists());
        assert_ne!(renamed_document.entry.asset_id, original_entry.asset_id);
        assert_eq!(renamed_document.document.font_family, "Google Sans");
        assert_eq!(renamed_document.document.font_size, "24pt");
        assert_eq!(renamed_document.document.blocks.len(), 2);
        assert_eq!(renamed_document.document.blocks[0].id, "block-1");
        assert_eq!(renamed_document.document.blocks[0].kind, "p");
        assert_eq!(renamed_document.document.blocks[0].line_height, Some(2.25));
        assert_eq!(
            renamed_document.document.blocks[0].keep_lines_together,
            Some(true)
        );
        assert_eq!(
            renamed_document.document.blocks[0].keep_with_next,
            Some(true)
        );
        assert_eq!(
            renamed_document.document.blocks[0].orphan_line_count,
            Some(3)
        );
        assert_eq!(
            renamed_document.document.blocks[0].space_after_pt,
            Some(18.0)
        );
        assert_eq!(
            renamed_document.document.blocks[0].space_before_pt,
            Some(6.0)
        );
        assert_eq!(renamed_document.document.blocks[1].id, "block-2");
        assert_eq!(renamed_document.document.blocks[1].text, "Second paragraph");
        assert_eq!(
            renamed_document.document.blocks[0].text_align.as_deref(),
            Some("center")
        );
        assert_eq!(
            renamed_document.document.blocks[1].text_align.as_deref(),
            None
        );
        assert_eq!(
            renamed_document.document.blocks[0].widow_line_count,
            Some(4)
        );
        assert_eq!(
            renamed_document.document.blocks[0].runs[0]
                .style
                .as_ref()
                .and_then(|style| style.character_spacing_pt),
            Some(1.5)
        );
        assert_eq!(
            renamed_document.document.blocks[0].runs[0]
                .style
                .as_ref()
                .and_then(|style| style.font_family.as_deref()),
            Some("Google Sans")
        );
        assert_eq!(
            renamed_document.document.blocks[0].runs[0]
                .style
                .as_ref()
                .and_then(|style| style.font_size.as_deref()),
            Some("18pt")
        );
        assert_eq!(
            renamed_document.document.blocks[0].runs[0]
                .style
                .as_ref()
                .and_then(|style| style.bold),
            Some(true)
        );
        assert_eq!(
            renamed_document.document.blocks[0].runs[0]
                .style
                .as_ref()
                .and_then(|style| style.italic),
            Some(true)
        );

        let renamed_manifest =
            read_inventory_manifest(&manifest_path).expect("renamed Inventory should be readable");
        assert_eq!(renamed_manifest.documents.nvd_documents.len(), 1);
        assert_eq!(
            renamed_manifest.documents.nvd_documents[0].title,
            "Final Notes"
        );
        assert_eq!(renamed_manifest.assets.len(), 1);
        assert_eq!(renamed_manifest.assets[0].notes, "Keep this note");
        assert_eq!(renamed_manifest.assets[0].tags, vec!["draft".to_string()]);
        assert_eq!(
            renamed_manifest.assets[0].kept_tags,
            vec!["nvd".to_string()]
        );
        assert!(renamed_manifest.library_tree[0].asset_ids.is_empty());
        assert_eq!(
            renamed_manifest.workspace_state.selected_asset_id,
            Some(renamed_document.entry.asset_id)
        );
        assert_eq!(
            renamed_manifest.workspace_state.active_nvd_document_path,
            Some(renamed_document.path.clone())
        );

        let deleted_entry = delete_nvd_document(
            manifest_path.to_string_lossy().to_string(),
            renamed_document.path.clone(),
        )
        .expect("Inventory-owned NVD document should delete");
        assert_eq!(deleted_entry.asset_id, renamed_document.entry.asset_id);
        assert!(!renamed_path.exists());

        let deleted_manifest =
            read_inventory_manifest(&manifest_path).expect("updated Inventory should be readable");
        assert!(deleted_manifest.documents.nvd_documents.is_empty());
        assert!(deleted_manifest.assets.is_empty());
        assert!(deleted_manifest.library_tree[0].asset_ids.is_empty());
        assert!(deleted_manifest.workspace_state.selected_asset_id.is_none());
        assert!(deleted_manifest
            .workspace_state
            .active_nvd_document_path
            .is_none());

        fs::remove_dir_all(&inventory_root).expect("test Inventory should be removed");
    }

    #[test]
    fn refuses_to_manage_nvd_documents_outside_inventory_documents_folder() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let inventory_root = std::env::temp_dir().join(format!(
            "inventory-document-safety-test-{}-{unique_suffix}",
            std::process::id()
        ));
        let manifest_path = inventory_root.join(INVENTORY_MANIFEST_FILENAME);
        let source_document_path = inventory_root.join("Source.nvd");
        fs::create_dir_all(inventory_root.join("documents"))
            .expect("documents directory should be created");

        let document = NvdDocument {
            schema_version: NVD_SCHEMA_VERSION,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Source".to_string(),
            created_at_unix: 10,
            updated_at_unix: 20,
            font_family: default_nvd_font_family(),
            font_size: default_nvd_font_size(),
            layout_mode: default_nvd_layout_mode(),
            page_layout: default_nvd_page_layout(),
            blocks: Vec::new(),
            page_objects: Vec::new(),
            styles: BTreeMap::new(),
        };
        write_nvd_document(&source_document_path, &document)
            .expect("test source NVD document should be written");
        let manifest = InventoryManifest {
            schema_version: INVENTORY_SCHEMA_VERSION,
            kind: INVENTORY_MANIFEST_KIND.to_string(),
            readme: inventory_manifest_readme("Test"),
            inventory: InventoryIdentityState {
                name: "Test".to_string(),
                created_at_unix: 10,
                updated_at_unix: 20,
            },
            root_path: None,
            source_folders: Vec::new(),
            assets: Vec::new(),
            library_tree: Vec::new(),
            project_tag_groups: Vec::new(),
            recent_user_tag_ids: Vec::new(),
            workspace_state: default_inventory_workspace_state(),
            documents: default_inventory_documents_state(),
            export_settings: default_inventory_export_settings(),
        };
        write_inventory_manifest(&manifest_path, &manifest)
            .expect("test Inventory manifest should be written");

        let rename_result = rename_nvd_document(
            manifest_path.to_string_lossy().to_string(),
            source_document_path.to_string_lossy().to_string(),
            "Renamed".to_string(),
            None,
        );
        let delete_result = delete_nvd_document(
            manifest_path.to_string_lossy().to_string(),
            source_document_path.to_string_lossy().to_string(),
        );

        assert!(rename_result.is_err());
        assert!(delete_result.is_err());
        assert!(source_document_path.exists());

        fs::remove_dir_all(&inventory_root).expect("test Inventory should be removed");
    }

    #[test]
    fn reconciles_inventory_document_registry_with_documents_folder() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after the Unix epoch")
            .as_nanos();
        let inventory_root = std::env::temp_dir().join(format!(
            "inventory-document-registry-test-{}-{unique_suffix}",
            std::process::id()
        ));
        let documents_dir = inventory_root.join("documents");
        let vectors_dir = inventory_root.join("vectors");
        let manifest_path = inventory_root.join(INVENTORY_MANIFEST_FILENAME);
        let valid_document_path = documents_dir.join("Ideas.nvd");
        let valid_vector_path = documents_dir.join("Mark.nvv");
        let missing_document_path = documents_dir.join("Missing.nvd");
        fs::create_dir_all(&documents_dir).expect("documents directory should be created");

        let valid_document = NvdDocument {
            schema_version: NVD_SCHEMA_VERSION,
            kind: NVD_DOCUMENT_KIND.to_string(),
            title: "Ideas".to_string(),
            created_at_unix: 10,
            updated_at_unix: 20,
            font_family: default_nvd_font_family(),
            font_size: default_nvd_font_size(),
            layout_mode: default_nvd_layout_mode(),
            page_layout: default_nvd_page_layout(),
            blocks: Vec::new(),
            page_objects: Vec::new(),
            styles: BTreeMap::new(),
        };
        write_nvd_document(&valid_document_path, &valid_document)
            .expect("test NVD document should be written");
        let valid_document_asset_id = stable_asset_id(&valid_document_path.to_string_lossy());
        let valid_vector = NvvDocument {
            schema_version: NVV_SCHEMA_VERSION,
            kind: NVV_DOCUMENT_KIND.to_string(),
            title: "Mark".to_string(),
            created_at_unix: 10,
            updated_at_unix: 20,
            canvas_width: 1200.0,
            canvas_height: 800.0,
            paths: Vec::new(),
        };
        write_nvv_document(&valid_vector_path, &valid_vector)
            .expect("test NVV document should be written");
        let valid_vector_asset_id = stable_asset_id(&valid_vector_path.to_string_lossy());

        let mut manifest = InventoryManifest {
            schema_version: INVENTORY_SCHEMA_VERSION,
            kind: INVENTORY_MANIFEST_KIND.to_string(),
            readme: inventory_manifest_readme("Test"),
            inventory: InventoryIdentityState {
                name: "Test".to_string(),
                created_at_unix: 10,
                updated_at_unix: 20,
            },
            root_path: None,
            source_folders: vec![SourceFolderState {
                id: "source-documents".to_string(),
                path: documents_dir.to_string_lossy().to_string(),
                name: "documents".to_string(),
                asset_ids: vec![valid_document_asset_id, valid_vector_asset_id],
                skipped_entries: 0,
                enabled: true,
            }],
            assets: vec![AssetRecord {
                id: 1,
                name: "Missing.nvd".to_string(),
                path: missing_document_path.to_string_lossy().to_string(),
                file_type: "Document".to_string(),
                extension: "nvd".to_string(),
                size_bytes: 0,
                modified_unix: None,
                content_clues: Vec::new(),
                analysis_caption: String::new(),
                analysis_error: String::new(),
                analysis_file_signature: String::new(),
                analysis_status: default_asset_analysis_status(),
                analysis_suggested_tags: Vec::new(),
                analysis_version: 0,
                kept_tags: Vec::new(),
                notes: String::new(),
                tags: Vec::new(),
            }],
            library_tree: vec![VirtualFolderState {
                id: "documents".to_string(),
                name: "Documents".to_string(),
                asset_ids: vec![valid_document_asset_id, valid_vector_asset_id],
                children: Vec::new(),
                disk_path: None,
                is_planned_on_disk: false,
                path_segment: "documents".to_string(),
                rules: Vec::new(),
                suggested_tags: Vec::new(),
                tags: Vec::new(),
                template_id: None,
            }],
            project_tag_groups: Vec::new(),
            recent_user_tag_ids: Vec::new(),
            workspace_state: default_inventory_workspace_state(),
            documents: InventoryDocumentsState {
                nvd_documents: vec![InventoryDocumentEntry {
                    id: "nvd-1".to_string(),
                    asset_id: 1,
                    kind: NVD_DOCUMENT_KIND.to_string(),
                    title: "Missing".to_string(),
                    path: missing_document_path.to_string_lossy().to_string(),
                    created_at_unix: 10,
                    updated_at_unix: 10,
                }],
                nvv_documents: Vec::new(),
            },
            export_settings: default_inventory_export_settings(),
        };

        reconcile_inventory_document_registry(&manifest_path, &mut manifest)
            .expect("document registry should reconcile");

        assert_eq!(manifest.documents.nvd_documents.len(), 1);
        assert_eq!(manifest.documents.nvd_documents[0].title, "Ideas");
        assert_eq!(manifest.documents.nvv_documents.len(), 1);
        assert_eq!(manifest.documents.nvv_documents[0].title, "Mark");
        assert!(vectors_dir.join("Mark.nvv").exists());
        assert!(!valid_vector_path.exists());
        assert_eq!(manifest.assets.len(), 2);
        assert_eq!(manifest.assets[0].name, "Ideas.nvd");
        assert!(manifest.source_folders[0].asset_ids.is_empty());
        assert!(manifest.library_tree[0].asset_ids.is_empty());

        fs::remove_dir_all(&inventory_root).expect("test Inventory should be removed");
    }

    #[test]
    fn atomically_creates_and_replaces_nvv_file_contents() {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "inventory-atomic-nvv-write-test-{}-{unique_suffix}",
            std::process::id()
        ));
        fs::create_dir_all(&root).expect("test folder should be created");
        let path = root.join("Vector.nvv");
        let mut document = NvvDocument {
            schema_version: NVV_SCHEMA_VERSION,
            kind: NVV_DOCUMENT_KIND.to_string(),
            title: "Vector".to_string(),
            created_at_unix: 10,
            updated_at_unix: 10,
            canvas_width: 1200.0,
            canvas_height: 800.0,
            paths: Vec::new(),
        };

        write_nvv_document(&path, &document).expect("NVV should be created");
        document.canvas_width = 512.0;
        document.canvas_height = 512.0;
        write_nvv_document(&path, &document).expect("NVV should be atomically replaced");

        let reopened = read_nvv_document(&path).expect("NVV should reopen");
        assert_eq!(reopened.canvas_width, 512.0);
        assert_eq!(reopened.canvas_height, 512.0);
        fs::remove_dir_all(root).expect("test folder should be removed");
    }

    #[test]
    fn extracts_meaningful_content_clues_from_text_documents() {
        let clues = extract_content_clues_from_text(
            "# Forge Notes\nThe blacksmith keeps an anvil, hammer, and tongs in the workshop.\n",
        );

        assert!(clues.contains(&"forge".to_string()));
        assert!(clues.contains(&"blacksmith".to_string()));
        assert!(clues.contains(&"anvil".to_string()));
        assert!(clues.contains(&"hammer".to_string()));
        assert!(clues.contains(&"workshop".to_string()));
    }

    #[test]
    fn ignores_low_signal_content_clue_terms() {
        let clues = extract_content_clues_from_text(
            "notes final misc v2 data json text file asset 1234 workshop shoreline",
        );

        assert_eq!(clues, vec!["workshop".to_string(), "shoreline".to_string()]);
    }
}

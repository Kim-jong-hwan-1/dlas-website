import os
import json
import re
import threading

import numpy as np
import trimesh
import xml.etree.ElementTree as ET

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkinterdnd2 import TkinterDnD, DND_FILES

from scipy.spatial import cKDTree

# vedo 시각화를 위해 (없으면 에러 없이 패스)
try:
    from vedo import Plotter, Points, Sphere, Line, Text3D, Mesh as VedoMesh
except ImportError:
    print("[INFO] 'vedo' 라이브러리가 설치되어 있지 않습니다. (pip install vedo)")

# 엑셀 저장 (Inner+Hole 모드 추가 기능)
try:
    import openpyxl
except ImportError:
    print("[INFO] 'openpyxl' 라이브러리가 설치되어 있지 않습니다. (pip install openpyxl)")

#################################################################
# [추가] constructioninfo 파싱 + 그룹 ID(어벗외/어벗 + 스크류채널)
#################################################################
try:
    import pandas as pd
except ImportError:
    print("[INFO] 'pandas' 라이브러리가 설치되어 있지 않습니다. (pip install pandas)")

def parse_construction_info(file_path, screw_teeth_set=None, save_excel=False):
    """
    XML .constructioninfo 파일 파싱 후,
    (Filename, PartType, ToothNumbers)를 담고,
    동일 (Filename + PartType)은 한 줄로 묶고 ToothNumbers는 쉼표로 병합.

    이후, PartType에 따라 '어벗' / '어벗외' 구분.
    '어벗외'는 매칭되는 모든 '어벗' 파일명을 MatchedAbutments 컬럼에 저장.
    → 'MatchedAbutments' 값이 동일한 '어벗외'는 같은 GroupID 부여.

    '어벗'도 매칭된 '어벗외'의 GroupID를 물려받아(여러개면 콤마 구분).

    [추가] screw_teeth_set = { 치식번호: 그룹ID를 붙일 스크류채널들 } 형태를 위해
          치식별로 "ScrewChannels_tooth_{T}.stl"을 한 행으로 추가.
          GroupID는 해당 치식(T)에 속한 어벗/어벗외의 그룹 ID 합집합.

    save_excel=True 면 같은 폴더에 '_parsed.xlsx' 저장
    """
    tree = ET.parse(file_path)
    root = tree.getroot()

    # 1) (Filename, PartType, ToothNumber) 추출
    data = []
    for construction_file in root.findall(".//ConstructionFile"):
        filename = construction_file.findtext("Filename")
        part_type = construction_file.findtext("PartType")

        tooth_numbers = construction_file.find("ToothNumbers")
        if tooth_numbers is not None:
            for tooth in tooth_numbers.findall("int"):
                data.append({
                    "Filename": filename,
                    "ToothNumber": tooth.text,
                    "PartType": part_type
                })

    df = pd.DataFrame(data)

    # 2) 그룹화(Filename + PartType) → ToothNumbers 쉼표로 병합
    grouped_df = (
        df.groupby(["Filename", "PartType"])["ToothNumber"]
        .apply(lambda x: ", ".join(sorted(set(x))))
        .reset_index()
    )
    grouped_df.rename(columns={"ToothNumber": "ToothNumbers"}, inplace=True)

    # 3) PartType에 따라 "어벗"/"어벗외" 분류
    def classify_part_type(pt):
        if pt and ("abutment" in pt.lower()):
            return "어벗"
        else:
            return "어벗외"

    grouped_df["Type"] = grouped_df["PartType"].apply(classify_part_type)

    # 4) "어벗"들의 (파일명, 치식set) 수집
    abut_rows = grouped_df[grouped_df["Type"] == "어벗"].copy()
    abut_list = []
    for idx, row in abut_rows.iterrows():
        tooth_set = set(t.strip() for t in row["ToothNumbers"].split(",")) if row["ToothNumbers"] else set()
        abut_list.append((row["Filename"], tooth_set))

    # 5) "어벗외" → MatchedAbutments(매칭된 어벗파일) 계산
    matched_abutments = []
    for idx, row in grouped_df.iterrows():
        if row["Type"] == "어벗":
            matched_abutments.append("")  # 어벗은 빈 문자열
            continue

        tooth_set_rest = set(t.strip() for t in row["ToothNumbers"].split(",")) if row["ToothNumbers"] else set()
        matched_list = []
        for abu_filename, abu_teeth in abut_list:
            # 교집합이 있으면 매칭
            if tooth_set_rest & abu_teeth:
                matched_list.append(abu_filename)

        if matched_list:
            matched_abutments.append(", ".join(sorted(set(matched_list))))
        else:
            matched_abutments.append("")

    grouped_df["MatchedAbutments"] = matched_abutments

    # 6) "어벗외"끼리 MatchedAbutments가 동일하면 동일한 GroupID
    grouped_df["GroupID"] = 0  # 기본값
    group_map = {}  # key: MatchedAbutments 문자열, value: group_id
    current_id = 1

    # 먼저 "어벗외" 할당
    for i, row in grouped_df.iterrows():
        if row["Type"] == "어벗외":
            key = row["MatchedAbutments"]
            if key not in group_map:
                group_map[key] = current_id
                current_id += 1
            grouped_df.at[i, "GroupID"] = group_map[key]

    # "어벗"도 매칭된 Group ID 부여
    for i, row in grouped_df.iterrows():
        if row["Type"] == "어벗":
            abut_file = row["Filename"]
            matched_gids = set()
            # 모든 '어벗외'와 비교
            for j, row2 in grouped_df.iterrows():
                if row2["Type"] == "어벗외":
                    abut_list2 = [x.strip() for x in row2["MatchedAbutments"].split(",") if x.strip()]
                    if abut_file in abut_list2:
                        matched_gids.add(row2["GroupID"])

            if matched_gids:
                # 여러 그룹에 속할 수 있으면 콤마로
                grouped_df.at[i, "GroupID"] = ",".join(str(g) for g in sorted(matched_gids))
            else:
                grouped_df.at[i, "GroupID"] = 0

    # 7) 스크류채널(ScrewChannels_tooth_XX.stl) 행 추가
    final_df = grouped_df[["Filename", "ToothNumbers", "Type", "MatchedAbutments", "GroupID"]].copy()

    # tooth-> set of groupIDs 만들기
    tooth2gids = {}
    for idx, row in final_df.iterrows():
        row_gid = row["GroupID"]
        # groupID가 "1,2" 등 콤마일 수도 있으니 set으로 파싱
        if isinstance(row_gid, str):
            if row_gid.strip() == "0":
                gid_set = set()
            else:
                gid_set = set(x.strip() for x in row_gid.split(",") if x.strip())
        else:
            # int or 0
            gid_set = set() if row_gid == 0 else {str(row_gid)}

        # 치식들
        if row["ToothNumbers"].strip():
            splitted = [x.strip() for x in row["ToothNumbers"].split(",") if x.strip()]
            for t_ in splitted:
                if t_ not in tooth2gids:
                    tooth2gids[t_] = set()
                # 합집합
                tooth2gids[t_].update(gid_set)

    # 이제, 스크류 채널 STL 행을 추가
    screw_rows = []
    if tooth2gids:
        for t, gidset in tooth2gids.items():
            # 없는 경우(=빈 set())면 0
            if gidset:
                group_id_str = ",".join(sorted(gidset))
            else:
                group_id_str = "0"
            # 새 행
            screw_rows.append({
                "Filename": f"ScrewChannels_tooth_{t}.stl",
                "ToothNumbers": t,
                "Type": "스크류채널",
                "MatchedAbutments": "",
                "GroupID": group_id_str
            })

    # 기존 rows + screw_rows
    if screw_rows:
        df_screw = pd.DataFrame(screw_rows)
        final_df = pd.concat([final_df, df_screw], ignore_index=True)

    # 저장
    if save_excel:
        excel_path = os.path.splitext(file_path)[0] + "_parsed.xlsx"
        final_df.to_excel(excel_path, index=False)
        print(f"[INFO] 엑셀 저장 완료: {excel_path}")

    return final_df


#################################################################
# 전역/CONFIG
#################################################################

global_stop_flag = False
input_files = []
progress_bar = None
progress_label = None
root = None
selected_mode = None  # "Shrink", "Inner Only", "Inner+Hole"

CONFIG_FILE = "config.json"

def load_config():
    if not os.path.isfile(CONFIG_FILE):
        return {
            "last_tab": "Shrink",
            "cement_thickness": 200.0,
            "hole_diameter": 2.0,
            "save_in_original": False,
            "margin_protect": 0.3
        }
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "margin_protect" not in data:
                data["margin_protect"] = 0.3
            return data
    except:
        return {
            "last_tab": "Shrink",
            "cement_thickness": 200.0,
            "hole_diameter": 2.0,
            "save_in_original": False,
            "margin_protect": 0.3
        }

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[DEBUG] Failed to save config: {e}")

cfg = load_config()

#################################################################
# 공통 유틸
#################################################################

def update_progress(percent, message):
    """GUI 진행 상황 업데이트"""
    print(f"[Progress] {percent:.1f}% - {message}")
    if progress_bar is not None:
        progress_bar['value'] = percent
    if progress_label is not None:
        progress_label.config(text=f"{int(percent)}% - {message}")
    if root is not None:
        root.update_idletasks()

def apply_transformation(vertices, T):
    """
    주어진 정점( Nx3 ) 좌표에 동차좌표 변환행렬 T (4x4)를 적용.
    """
    vertices_homo = np.hstack((vertices, np.ones((vertices.shape[0], 1))))
    transformed = (T @ vertices_homo.T).T
    return transformed[:, :3] / transformed[:, 3][:, np.newaxis]

def parse_matrix(elem):
    """
    XML element 내에 _00, _01, ... _33 형태로 들어 있는 float 값을
    4x4 numpy 배열(column-major)로 읽어들이는 함수
    """
    M = np.zeros((4, 4), dtype=float)
    for i in range(4):
        for j in range(4):
            tag = f"_{i}{j}"
            value = elem.find(tag)
            M[i, j] = float(value.text) if (value is not None and value.text) else 0.0
    return M

def convert_matrix_to_row_major(M_col):
    """컬럼-메이저 행렬을 전치하여 row-major 형식으로 변환"""
    return M_col.T

def compute_inverse(M):
    """4x4 행렬의 역행렬 계산"""
    return np.linalg.inv(M)

def find_transformation_matrix(root, stl_name):
    """
    EXOCAD .constructioninfo XML에서 stl_name에 해당하는 변환행렬(글로벌*Zrot)
    """
    global_T_inv = np.identity(4)
    global_elem = root.find("MatrixToScanDataFiles")
    if global_elem is not None:
        global_M_col = parse_matrix(global_elem)
        global_M = convert_matrix_to_row_major(global_M_col)
        global_T_inv = compute_inverse(global_M)

    file_T_inv = np.identity(4)
    cf_list = root.find("ConstructionFileList")
    if cf_list is not None:
        for cf in cf_list.findall("ConstructionFile"):
            fname_elem = cf.find("Filename")
            if fname_elem is not None and fname_elem.text is not None and stl_name in fname_elem.text:
                zrot_elem = cf.find("ZRotationMatrix")
                if zrot_elem is not None:
                    file_M_col = parse_matrix(zrot_elem)
                    file_M = convert_matrix_to_row_major(file_M_col)
                    file_T_inv = compute_inverse(file_M)
                break

    return global_T_inv @ file_T_inv

#################################################################
# 마진 관련
#################################################################

def extract_margin_groups(construction_info_path, stl_name):
    """
    .constructioninfo 에서 margin 포인트들을 추출
    (태그명 'margin' & stl_name 매칭)
    """
    tree = ET.parse(construction_info_path)
    root = tree.getroot()
    margin_groups = []

    for elem in root.iter():
        tag_lower = elem.tag.lower()
        if "margin" in tag_lower and all(exclude not in tag_lower for exclude in ["emergence", "screw", "implant"]):
            filename_elem = elem.find("Filename")
            if filename_elem is not None and filename_elem.text not in stl_name:
                continue

            margin_points = []
            for vec3 in elem.findall("Vec3"):
                x = vec3.findtext("x")
                y = vec3.findtext("y")
                z = vec3.findtext("z")
                if x and y and z:
                    margin_points.append([float(x), float(y), float(z)])
            if margin_points:
                margin_groups.append((elem.tag, np.array(margin_points)))

    return margin_groups, root

def find_locked_indices(vertices, margin_points, threshold=0.5):
    """
    margin_points 주변 threshold 내의 vertex index를 찾음
    """
    locked_indices = set()
    for mp in margin_points:
        dists = np.linalg.norm(vertices - mp, axis=1)
        close_idx = np.where(dists < threshold)[0]
        locked_indices.update(close_idx)
    return locked_indices

def is_margin_fully_matched(margin_points, vertices, threshold=0.5):
    """
    margin 좌표와 STL 정점간 최소거리로 매칭 여부
    """
    for mp in margin_points:
        dists = np.linalg.norm(vertices - mp, axis=1)
        if np.min(dists) > threshold:
            return False
    return True

#################################################################
# 어벗(Abutment) 여부 / EXO or 3shape 감지
#################################################################

def detect_exo_or_3shape(folder_dir):
    for fname in os.listdir(folder_dir):
        if fname.lower().endswith(".constructioninfo"):
            return "exo"
    for fname in os.listdir(folder_dir):
        low = fname.lower()
        if low.startswith("implantdirectionposition") and low.endswith(".xml"):
            return "3shape"
    return None

def is_abutment_stl(fpath):
    return ("abutment_cad" in os.path.basename(fpath).lower())

#################################################################
# 스크류 채널(홀) 관련
#################################################################

def create_cylinder(start, end, radius=0.7, sections=32, length_mm=30.0, offset_mm=10.0):
    """
    start->end 방향으로 offset_mm 이동 + length_mm 길이 원통
    """
    start = np.array(start, dtype=float)
    direction = np.array(end, dtype=float) - start
    norm_dir = np.linalg.norm(direction)
    if norm_dir < 1e-9:
        return None

    dir_unit = direction / norm_dir
    start_shifted = start + dir_unit * offset_mm
    end_shifted = start_shifted + dir_unit * length_mm
    height = np.linalg.norm(end_shifted - start_shifted)

    cyl = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    z_axis = np.array([0, 0, 1], dtype=float)
    axis = np.cross(z_axis, dir_unit)
    angle = np.arccos(np.clip(np.dot(z_axis, dir_unit), -1.0, 1.0))
    if np.linalg.norm(axis) > 1e-6:
        R = trimesh.transformations.rotation_matrix(angle, axis)
        cyl.apply_transform(R)

    cyl.apply_translation(start_shifted)
    return cyl

def parse_all_screws_by_tooth(xml_root):
    """
    <Tooth> 내부 ScrewChannelStart / ScrewChannelEnd
    """
    screws_by_tooth = {}
    for tooth in xml_root.iter("Tooth"):
        tooth_num = (tooth.findtext("ToothNumber") or tooth.findtext("Number") or "?").lstrip("0")
        starts = tooth.findall("ScrewChannelStart")
        ends = tooth.findall("ScrewChannelEnd")
        screws = []
        for scs, sce in zip(starts, ends):
            x1 = scs.find("x"); y1 = scs.find("y"); z1 = scs.find("z")
            x2 = sce.find("x"); y2 = sce.find("y"); z2 = sce.find("z")
            if None in (x1,y1,z1,x2,y2,z2) or any(v.text is None for v in [x1,y1,z1,x2,y2,z2]):
                continue
            start = [float(x1.text), float(y1.text), float(z1.text)]
            end = [float(x2.text), float(y2.text), float(z2.text)]
            screws.append((start, end))
        if screws:
            screws_by_tooth[tooth_num] = screws
    return screws_by_tooth

#################################################################
# Shrink (전면 오프셋)
#################################################################

def shrink_single_file(fpath, offset_mm, save_in_original, output_folder):
    """모든 면에 대해 동일하게 offset_mm 만큼 inward shrink"""
    try:
        mesh = trimesh.load_mesh(fpath)
    except Exception as e:
        print(f"[DEBUG] Error loading: {fpath}: {e}")
        return False

    if not hasattr(mesh, 'vertex_normals') or mesh.vertex_normals is None:
        mesh.compute_vertex_normals()

    new_verts = mesh.vertices - mesh.vertex_normals * offset_mm
    new_mesh = trimesh.Trimesh(vertices=new_verts, faces=mesh.faces, process=False)

    base_name = os.path.splitext(os.path.basename(fpath))[0]
    if save_in_original:
        outdir = os.path.dirname(fpath)
    else:
        outdir = output_folder
    outname = f"{base_name}_shrink_{int(offset_mm*1000)}um.stl"
    outpath = os.path.join(outdir, outname)
    try:
        new_mesh.export(outpath)
        print(f"[DEBUG] Shrink saved -> {outname}")
        return True
    except Exception as e:
        print(f"[DEBUG] Error exporting {outname}: {e}")
        return False

def process_shrink(files, output_folder, cement_thickness, save_in_original):
    offset_mm = cement_thickness * 0.001
    total = len(files)
    done = 0
    for i, fpath in enumerate(files, start=1):
        if global_stop_flag:
            break
        if is_abutment_stl(fpath):
            print(f"[DEBUG] Skip abutment in shrink: {os.path.basename(fpath)}")
            update_progress(i/total*100, f"Skip abutment {i}/{total}")
            continue
        shrink_single_file(fpath, offset_mm, save_in_original, output_folder)
        done += 1
        update_progress(i/total*100, f"Shrinking {i}/{total}")
    print(f"[INFO] Shrink finished: {done} files processed.")

#################################################################
# Inner Only 모드
#################################################################

def gather_abutment_vertices(all_files):
    """
    모든 abutment_CAD*.stl 파일을 글로벌 좌표로 변환 후 정점을 합침
    """
    all_verts = None
    for f in all_files:
        if not is_abutment_stl(f):
            continue
        folder = os.path.dirname(f)
        cinfo = None
        for fn in os.listdir(folder):
            if fn.lower().endswith(".constructioninfo"):
                cinfo = os.path.join(folder, fn)
                break
        if cinfo is None:
            continue
        try:
            mesh_abu = trimesh.load_mesh(f)
            root_xml = ET.parse(cinfo).getroot()
            T_total = find_transformation_matrix(root_xml, os.path.basename(f))
            abut_verts = apply_transformation(mesh_abu.vertices, T_total)
            if abut_verts is not None:
                if all_verts is None:
                    all_verts = abut_verts
                else:
                    all_verts = np.vstack((all_verts, abut_verts))
        except:
            continue
    return all_verts

def process_inner_only_exo(
    fpath,
    abutment_vertices,
    cement_thickness,
    save_in_original,
    output_folder,
    margin_protect_mm
):
    """
    EXOCAD 기준, 내면 offset (abutment와 가까운 부분) + margin 보호
    """
    folder = os.path.dirname(fpath)
    cinfo = None
    for fn in os.listdir(folder):
        if fn.lower().endswith(".constructioninfo"):
            cinfo = os.path.join(folder, fn)
            break
    if cinfo is None:
        print(f"[DEBUG] No .constructioninfo -> fallback shrink for {os.path.basename(fpath)}")
        return False

    try:
        mesh = trimesh.load_mesh(fpath)
    except Exception as e:
        print(f"[DEBUG] Error loading {fpath}: {e}")
        return False

    if not hasattr(mesh, 'vertex_normals') or mesh.vertex_normals is None:
        mesh.compute_vertex_normals()

    root_xml = ET.parse(cinfo).getroot()
    T_total = find_transformation_matrix(root_xml, os.path.basename(fpath))

    original_verts = mesh.vertices.copy()
    trans_verts = apply_transformation(original_verts, T_total)

    if abutment_vertices is None or len(abutment_vertices) == 0:
        print("[DEBUG] No abutment data -> fallback shrink")
        return False

    dist_threshold = 0.2
    tree = cKDTree(abutment_vertices)
    face_centers = np.mean(trans_verts[mesh.faces], axis=1)
    min_dists, _ = tree.query(face_centers, k=1)
    close_faces = np.where(min_dists < dist_threshold)[0]
    if len(close_faces) == 0:
        print("[DEBUG] No inner face -> fallback shrink")
        return False

    inner_vert_ids = set()
    for fidx in close_faces:
        for vid in mesh.faces[fidx]:
            inner_vert_ids.add(vid)

    margin_groups, _ = extract_margin_groups(cinfo, os.path.basename(fpath))
    locked_vert_ids = set()
    for margin_tag, margin_pts in margin_groups:
        margin_pts_global = apply_transformation(margin_pts, T_total)
        lock_idx = find_locked_indices(trans_verts, margin_pts_global, threshold=margin_protect_mm)
        locked_vert_ids.update(lock_idx)

    offset_mm = cement_thickness * 0.001
    new_verts = original_verts.copy()

    offset_targets = list(set(inner_vert_ids) - locked_vert_ids)
    new_verts[offset_targets] -= mesh.vertex_normals[offset_targets] * offset_mm

    mesh.vertices = new_verts

    base_name = os.path.splitext(os.path.basename(fpath))[0]
    if save_in_original:
        outdir = folder
    else:
        outdir = output_folder
    outname = f"{base_name}_inner_only_{int(cement_thickness)}um.stl"
    outpath = os.path.join(outdir, outname)
    try:
        mesh.export(outpath)
        print(f"[DEBUG] Inner offset success -> {outname}")
        return True
    except Exception as e:
        print(f"[DEBUG] Error exporting {outname}: {e}")
        return False

def process_inner_only(all_files, output_folder, cement_thickness, save_in_original, margin_protect):
    """
    면만 세멘 오프셋(어벗 인접 face) & 마진 보호 (치식 구분 없음)
    """
    abut_verts = gather_abutment_vertices(all_files)
    offset_mm = cement_thickness * 0.001
    total = len(all_files)
    done = 0
    for i, fpath in enumerate(all_files, start=1):
        if global_stop_flag:
            break
        if is_abutment_stl(fpath):
            print(f"[DEBUG] skip abut in inner: ", os.path.basename(fpath))
            update_progress(i/total*100, f"skip abutment {i}/{total}")
            continue

        folder = os.path.dirname(fpath)
        ftype = detect_exo_or_3shape(folder)
        success = False
        if ftype == "exo":
            success = process_inner_only_exo(
                fpath, abut_verts, cement_thickness, save_in_original,
                output_folder, margin_protect_mm=margin_protect
            )
        elif ftype == "3shape":
            # 3shape 처리 로직이 필요하다면 추가 구현
            pass

        if not success:
            # fallback -> 그냥 shrink
            shrink_single_file(fpath, offset_mm, save_in_original, output_folder)
        done += 1
        update_progress(i/total*100, f"Inner {i}/{total}")
    print(f"[INFO] Inner Only done. {done} files processed.")

#################################################################
# 치식 파싱 (여러 치식 동시 인식)
#################################################################

def parse_tooth_numbers(filename):
    """
    파일명에서 등장하는 모든 숫자를 리스트로 추출.
    예: "bridge_12_13_14.stl" -> ["12", "13", "14"]
    """
    matches = re.findall(r"(\d+)", filename)
    return matches

#################################################################
# Inner+Hole 모드
#################################################################

def visualize_multiple(
    stl_data,
    abutment_vertices,
    screw_by_tooth,
    tooth_transform_map,
    hole_diameter,
    output_folder,
    save_in_original,
    folder
):
    """
    시각화 + 스크류 실린더 STL 저장
    """
    try:
        plotter = Plotter(title="Margin + Internal + Screw", axes=1)

        # 어벗 정점 표시(녹색)
        plotter += Points(abutment_vertices, r=3, c='green')
        tree = cKDTree(abutment_vertices)

        # STL들 표시 & margin 시각화
        for transformed_vertices, faces, margin_matches, source_name in stl_data:
            # 보철 STL 정점(회색)
            plotter += Points(transformed_vertices, r=3, c='lightgray')

            # 어벗과 가까운 face(노란색)
            face_centers = np.mean(transformed_vertices[faces], axis=1)
            min_dists, _ = tree.query(face_centers, k=1)
            close_face_indices = np.where(min_dists < 0.2)[0]

            if len(close_face_indices) > 0:
                close_faces = faces[close_face_indices]
                yellow_mesh = VedoMesh([transformed_vertices, close_faces]).c('yellow').alpha(1)
                plotter += yellow_mesh

            # margin 라인 표시
            for tooth_id, transformed_margin, locked_indices in margin_matches:
                if is_margin_fully_matched(transformed_margin, transformed_vertices, threshold=0.5):
                    plotter += Points(transformed_vertices[list(locked_indices)], r=10, c='red')
                    if len(transformed_margin) >= 3:
                        plotter += Line(transformed_margin, closed=True).c('blue').lw(2)
                        label_pos = np.mean(transformed_margin, axis=0)
                        # [수정부분] 폰트 인자를 명시하여 fonts/ 폴더를 찾지 않도록 함
                        plotter += Text3D(tooth_id, pos=label_pos + [0,0,1], s=1, c='green', font="Normografo")
                    else:
                        plotter += Points(transformed_margin, r=6, c='blue')

        # 스크류 채널(오렌지) + STL 저장
        for tooth_num, screws in screw_by_tooth.items():
            if tooth_num not in tooth_transform_map:
                continue
            T = tooth_transform_map[tooth_num]

            cylinders = []
            for i, (start, end) in enumerate(screws, start=1):
                cyl = create_cylinder(start, end, radius=hole_diameter / 2.0, length_mm=30.0, offset_mm=10.0)
                if cyl is not None:
                    cyl.apply_transform(T)
                    plotter += VedoMesh([cyl.vertices, cyl.faces], c='orange', alpha=0.6)
                    cylinders.append(cyl)

            # STL로 저장(유니온)
            if len(cylinders) == 0:
                continue
            if len(cylinders) == 1:
                union_cyl = cylinders[0]
            else:
                try:
                    union_result = trimesh.boolean.union(cylinders, engine='auto')
                    if isinstance(union_result, list) and len(union_result) > 0:
                        union_cyl = union_result[0]
                    else:
                        union_cyl = union_result
                except Exception as e:
                    print(f"[ERROR] Union failed for tooth {tooth_num}: {e}")
                    union_cyl = None

            if union_cyl is not None:
                # 폴더
                if save_in_original:
                    outdir = folder
                else:
                    outdir = output_folder
                os.makedirs(outdir, exist_ok=True)

                screw_stl = os.path.join(outdir, f"ScrewChannels_tooth_{tooth_num}.stl")
                try:
                    union_cyl.export(screw_stl)
                    print(f"[DEBUG] Screw channel STL saved -> {screw_stl}")
                except Exception as e:
                    print(f"[ERROR] Failed to export screw channel STL: {e}")

        plotter.show(viewup="z")
    except Exception as e:
        print(f"[ERROR] Visualization error: {e}")

def process_inner_hole(
    all_files,
    output_folder,
    cement_thickness,
    hole_diameter,
    save_in_original,
    margin_protect
):
    """
    'Inner+Hole' 모드:
      1) constructionInfo -> 글로벌좌표 변환
      2) 어벗외 STL에 대해 스크류 실린더 Boolean Difference로 홀 제거
      3) STL 저장
      4) vedo 시각화 + 스크류채널 STL 저장
      5) STL별 치식 → InnerHole_Result.xlsx
      6) constructioninfo → _parsed.xlsx (어벗/어벗외/스크류채널 포함)
    """
    if not all_files:
        print("[INFO] No STL files to visualize.")
        update_progress(100, "No STL files to visualize.")
        return

    try:
        from vedo import Plotter
    except ImportError:
        print("[ERROR] 'vedo' library is required for visualization. (pip install vedo)")
        update_progress(100, "Visualization failed: vedo not installed.")
        return

    folder = os.path.dirname(all_files[0]) if all_files else ""
    construction_info_path = None
    for f in os.listdir(folder):
        if f.lower().endswith(".constructioninfo"):
            construction_info_path = os.path.join(folder, f)
            break

    if not construction_info_path:
        print("[INFO] constructionInfo 파일을 찾을 수 없습니다.")
        update_progress(100, "No constructionInfo file found.")
        return

    try:
        xml_root = ET.parse(construction_info_path).getroot()
    except Exception as e:
        print(f"[ERROR] Failed to parse constructionInfo: {e}")
        update_progress(100, "Failed to parse constructionInfo.")
        return

    screw_by_tooth = parse_all_screws_by_tooth(xml_root)

    abutment_vertices = None
    stl_data = []
    tooth_transform_map = {}

    # STL 별 (파일명, 치식)
    excel_data = []

    total = len(all_files)

    for i, stl_path in enumerate(all_files, start=1):
        if global_stop_flag:
            break
        stl_name = os.path.basename(stl_path)

        T_total = find_transformation_matrix(xml_root, stl_name)

        # STL 로드
        try:
            mesh = trimesh.load_mesh(stl_path)
        except Exception as e:
            print(f"[DEBUG] Error loading {stl_name}: {e}")
            update_progress(i/total*100, f"Skipping {stl_name} (load error) {i}/{total}")
            excel_data.append([stl_name, ""])
            continue

        if not hasattr(mesh, 'vertex_normals') or mesh.vertex_normals is None:
            mesh.compute_vertex_normals()

        original_verts = mesh.vertices.copy()
        transformed_vertices = apply_transformation(original_verts, T_total)
        transformed_mesh = trimesh.Trimesh(vertices=transformed_vertices, faces=mesh.faces, process=False)

        base_name = os.path.splitext(stl_name)[0]
        outdir = folder if save_in_original else output_folder
        os.makedirs(outdir, exist_ok=True)

        # _transformed.stl
        out_transformed_path = os.path.join(outdir, f"{base_name}_transformed.stl")
        try:
            transformed_mesh.export(out_transformed_path)
            print(f"[DEBUG] Transformed STL saved -> {out_transformed_path}")
        except Exception as e:
            print(f"[DEBUG] Error exporting transformed STL {out_transformed_path}: {e}")

        # 치식 파싱
        extracted_teeth = parse_tooth_numbers(stl_name)

        # 어벗 체크
        if "abutment" in stl_name.lower():
            # 어벗 정점 누적
            if abutment_vertices is None:
                abutment_vertices = transformed_vertices
            else:
                abutment_vertices = np.vstack((abutment_vertices, transformed_vertices))

            # 여러 치식
            if extracted_teeth:
                for tnum in extracted_teeth:
                    tooth_transform_map[tnum.lstrip("0")] = T_total
                    excel_data.append([stl_name, tnum])
            else:
                excel_data.append([stl_name, ""])

            update_progress(i/total*100, f"Processing abutment {stl_name} {i}/{total}")
            continue

        # 어벗외
        if extracted_teeth:
            for tnum in extracted_teeth:
                excel_data.append([stl_name, tnum])
        else:
            excel_data.append([stl_name, ""])

        margin_groups, _ = extract_margin_groups(construction_info_path, stl_name)
        margin_matches = []
        final_verts_for_viz = transformed_vertices.copy()
        final_faces_for_viz = mesh.faces.copy()

        # 마진
        for tooth_id, margin_set in margin_groups:
            t_margin = apply_transformation(margin_set, T_total)
            locked_indices = find_locked_indices(final_verts_for_viz, t_margin, threshold=0.5)
            if len(locked_indices) >= len(t_margin):
                margin_matches.append((tooth_id, t_margin, locked_indices))

        # 스크류 홀 제거
        engine_name = "auto"
        current_mesh = transformed_mesh

        for tnum in extracted_teeth:
            if tnum.lstrip("0") in screw_by_tooth:
                screws_info = screw_by_tooth[tnum.lstrip("0")]
                for idx_screw, (start, end) in enumerate(screws_info, start=1):
                    cyl = create_cylinder(
                        start, end,
                        radius=hole_diameter / 2.0,
                        length_mm=30.0,
                        offset_mm=10.0
                    )
                    if cyl is None:
                        continue
                    cyl.apply_transform(T_total)

                    try:
                        diff_result = trimesh.boolean.difference([current_mesh, cyl], engine=engine_name)
                        if diff_result is not None and len(diff_result) > 0:
                            if isinstance(diff_result, list):
                                current_mesh = diff_result[0]
                            else:
                                current_mesh = diff_result
                        else:
                            print(f"[DEBUG] boolean difference returned None/empty for {stl_name}")
                    except Exception as e:
                        print(f"[DEBUG] Boolean difference failed: {e}")

        # hole_removed.stl
        out_removed_path = os.path.join(outdir, f"{base_name}_hole_removed.stl")
        try:
            current_mesh.export(out_removed_path)
            print(f"[DEBUG] Hole-removed STL saved -> {out_removed_path}")
        except Exception as e:
            print(f"[DEBUG] Error exporting hole-removed STL {out_removed_path}: {e}")

        final_verts_for_viz = current_mesh.vertices
        final_faces_for_viz = current_mesh.faces

        # 시각화용
        stl_data.append((final_verts_for_viz, final_faces_for_viz, margin_matches, stl_name))

        update_progress(i/total*100, f"Processed {stl_name} {i}/{total}")

    if abutment_vertices is None:
        print("[INFO] 어벗 STL이 없습니다.")
        update_progress(100, "No abutment STL found.")
        return

    print("[INFO] Starting visualization and screw channel export...")
    update_progress(90, "Preparing visualization and export...")

    try:
        visualize_multiple(
            stl_data,
            abutment_vertices,
            screw_by_tooth,
            tooth_transform_map,
            hole_diameter,
            output_folder,
            save_in_original,
            folder
        )
    except Exception as e:
        print(f"[ERROR] Visualization/export failed: {e}")
        update_progress(100, f"Visualization/export failed: {str(e)}")
        return

    # (기존) STL별 치식 → InnerHole_Result.xlsx
    try:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Inner+Hole Result"
        ws.append(["STL Name", "Tooth Num"])

        for row in excel_data:
            ws.append(row)

        excel_path = os.path.join(output_folder, "InnerHole_Result.xlsx")
        wb.save(excel_path)
        print(f"[INFO] Excel saved: {excel_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save Excel: {e}")

    update_progress(100, "Visualization and export completed.")
    print("[INFO] Visualization and screw channel export completed.")

    # constructioninfo → _parsed.xlsx
    try:
        parse_construction_info(construction_info_path, save_excel=True)
    except Exception as e:
        print(f"[ERROR] Failed to parse construction info and save excel: {e}")


#################################################################
# GUI 및 메인 실행
#################################################################

def on_close():
    """창 닫기 시 config 저장"""
    global cfg
    try:
        cv = float(cement_entry.get())
        cfg["cement_thickness"] = cv
    except:
        pass
    try:
        hv = float(hole_dia_entry.get())
        cfg["hole_diameter"] = hv
    except:
        pass
    try:
        mpv = float(margin_protect_entry.get())
        cfg["margin_protect"] = mpv
    except:
        pass
    cfg["save_in_original"] = save_in_original_var.get()
    save_config(cfg)
    root.destroy()

def drop_folder(event):
    data = event.data
    paths = root.tk.splitlist(data)
    for path in paths:
        if os.path.isdir(path):
            input_folder_entry.delete(0, tk.END)
            input_folder_entry.insert(0, path)

def select_input_folder():
    folder = filedialog.askdirectory(title="Select Input Folder")
    if folder:
        input_folder_entry.delete(0, tk.END)
        input_folder_entry.insert(0, folder)

def add_files():
    global input_files
    files = filedialog.askopenfilenames(
        title="Select Files",
        filetypes=[("STL files", "*.stl"), ("All Files", "*.*")]
    )
    for f in files:
        if f not in input_files:
            input_files.append(f)
            file_listbox.insert(tk.END, f)

def remove_selected_file():
    global input_files
    selected = file_listbox.curselection()
    for index in reversed(selected):
        file_listbox.delete(index)
        del input_files[index]

def clear_files():
    global input_files
    file_listbox.delete(0, tk.END)
    input_files.clear()

def start_processing():
    global global_stop_flag
    global selected_mode
    global input_files

    global_stop_flag = False

    folder = input_folder_entry.get().strip()
    if not folder and not input_files:
        messagebox.showerror("Error", "Input folder or files required.")
        return

    output_folder = output_folder_entry.get().strip()
    if not save_in_original_var.get() and not output_folder:
        messagebox.showerror("Error", "Output folder is required (or check 'Save in Original').")
        return

    try:
        cement_val = float(cement_entry.get())
    except:
        cement_val = 0.0
    try:
        hole_val = float(hole_dia_entry.get())
    except:
        hole_val = 2.0
    try:
        margin_protect_val = float(margin_protect_entry.get())
    except:
        margin_protect_val = 0.3

    folder_files = []
    if folder and os.path.isdir(folder):
        folder_files = [os.path.join(folder, x) for x in os.listdir(folder) if x.lower().endswith(".stl")]
    all_stls = list(set(folder_files + input_files))
    if not all_stls:
        update_progress(100, "No STL found.")
        return

    save_in_original = save_in_original_var.get()
    mode = selected_mode

    update_progress(0, f"Starting {mode}...")

    def worker():
        if mode == "Shrink":
            process_shrink(all_stls, output_folder, cement_val, save_in_original)
        elif mode == "Inner Only":
            process_inner_only(all_stls, output_folder, cement_val, save_in_original, margin_protect_val)
        elif mode == "Inner+Hole":
            process_inner_hole(all_stls, output_folder, cement_val, hole_val, save_in_original, margin_protect_val)
        else:
            print("[DEBUG] Unknown mode")
        update_progress(100, f"{mode} finished.")

    t = threading.Thread(target=worker)
    t.start()

def stop_processing():
    global global_stop_flag
    global_stop_flag = True
    print("[INFO] Stop requested.")

def go_back_to_mode():
    detail_frame.pack_forget()
    mode_label.config(text="")
    mode_frame.pack(pady=40)

def select_mode(m):
    global selected_mode
    selected_mode = m
    mode_frame.pack_forget()

    if m == "Shrink":
        mode_label.config(text="SHRINK MODE")
        lbl_cement.grid_remove()
        cement_entry.grid_remove()
        lbl_margin.grid_remove()
        margin_protect_entry.grid_remove()
        lbl_hole.grid_remove()
        hole_dia_entry.grid_remove()

    elif m == "Inner Only":
        mode_label.config(text="INNER ONLY MODE")
        lbl_cement.grid(row=6, column=0, sticky="w", padx=10, pady=(5,0))
        cement_entry.grid(row=6, column=1, sticky="w", pady=(5,0))
        lbl_margin.grid(row=7, column=0, sticky="w", padx=10, pady=(5,0))
        margin_protect_entry.grid(row=7, column=1, sticky="w", pady=(5,0))
        lbl_hole.grid_remove()
        hole_dia_entry.grid_remove()

    elif m == "Inner+Hole":
        mode_label.config(text="INNER+HOLE MODE")
        lbl_cement.grid(row=6, column=0, sticky="w", padx=10, pady=(5,0))
        cement_entry.grid(row=6, column=1, sticky="w", pady=(5,0))
        lbl_margin.grid(row=7, column=0, sticky="w", padx=10, pady=(5,0))
        margin_protect_entry.grid(row=7, column=1, sticky="w", pady=(5,0))
        lbl_hole.grid(row=8, column=0, sticky="w", padx=10, pady=5)
        hole_dia_entry.grid(row=8, column=1, sticky="w", pady=5)

    detail_frame.pack(fill="both", expand=True, padx=20, pady=10)

def run_gui():
    global root
    global progress_bar, progress_label
    global input_folder_entry, file_listbox
    global output_folder_entry
    global cement_entry, hole_dia_entry, margin_protect_entry
    global save_in_original_var
    global detail_frame
    global mode_frame
    global mode_label
    global lbl_cement, lbl_hole, lbl_margin

    root = TkinterDnD.Tk()
    root.title("fast_transfer_jig_maker")
    root.geometry("900x600")
    root.resizable(False, False)
    root.protocol("WM_DELETE_WINDOW", on_close)
    root.configure(bg="#FFFFFF")

    top_frame = tk.Frame(root, bg="#FFFFFF")
    top_frame.pack(side="top", fill="x", pady=10)

    def load_and_scale_image(path, scale=0.35):
        try:
            from PIL import Image, ImageTk
            from PIL.Image import Resampling
            img = Image.open(path)
            w, h = img.size
            new_w, new_h = int(w * scale), int(h * scale)
            img = img.resize((new_w, new_h), Resampling.LANCZOS)
            return ImageTk.PhotoImage(img)
        except Exception as e:
            print(f"[DEBUG] Image load/scale error: {e}")
            return None

    t_img = load_and_scale_image("fast_transfer_jig_maker.png", 0.35)
    if t_img:
        title_label = tk.Label(top_frame, image=t_img, bg="#FFFFFF")
        title_label.image = t_img
        title_label.pack(side="top", anchor="center")
    else:
        title_label = tk.Label(top_frame, text="fast_transfer_jig_maker",
                               bg="#FFFFFF", fg="black",
                               font=("Arial", 14, "bold"))
        title_label.pack(side="top", anchor="center")

    mode_frame = tk.Frame(root, bg="#FFFFFF")
    mode_frame.pack(pady=40, fill="x")

    mode_buttons_frame = tk.Frame(mode_frame, bg="#FFFFFF")
    mode_buttons_frame.pack(anchor="center")

    desc_label = tk.Label(mode_frame, text="", bg="#FFFFFF", fg="gray",
                          wraplength=500, justify="left", font=("Arial", 12))
    desc_label.pack(side="bottom", pady=10)

    style = ttk.Style()
    style.theme_use("clam")
    style.configure(
        "Mode.TButton",
        font=("Arial", 20, "bold"),
        padding=20,
        relief="raised",
        borderwidth=3
    )
    style.map("Mode.TButton",
        background=[("active", "#EEEEEE"), ("pressed", "#DDDDDD")],
        relief=[("pressed", "sunken")],
        focuscolor=[("focus", ""), ("!focus", "")]
    )

    def on_shrink_enter(e):
        desc_label.config(text=(
            "SHRINK MODE:\n"
            "모든 면을 균일하게 지정값(µm)만큼 오프셋(두께 감소)."
        ))
    def on_inner_only_enter(e):
        desc_label.config(text=(
            "INNER ONLY MODE:\n"
            "어버트먼트 인접 면만 오프셋(세멘) + 마진 보호.\n"
            "Exocad .constructioninfo 기반 인식"
        ))
    def on_inner_hole_enter(e):
        desc_label.config(text=(
            "INNER+HOLE MODE:\n"
            "치식별 스크류 홀 생성 후 보철 STL에서 제거 + 스크류채널 STL 저장.\n"
            "그룹ID도 스크류채널에 포함."
        ))
    def on_leave(e):
        desc_label.config(text="")

    shrink_btn = ttk.Button(
        mode_buttons_frame,
        text="Shrink",
        style="Mode.TButton",
        takefocus=0,
        command=lambda: select_mode("Shrink"),
        width=10
    )
    shrink_btn.pack(side="left", padx=30)
    shrink_btn.bind("<Enter>", on_shrink_enter)
    shrink_btn.bind("<Leave>", on_leave)

    inner_btn = ttk.Button(
        mode_buttons_frame,
        text="Inner Only",
        style="Mode.TButton",
        takefocus=0,
        command=lambda: select_mode("Inner Only"),
        width=10
    )
    inner_btn.pack(side="left", padx=30)
    inner_btn.bind("<Enter>", on_inner_only_enter)
    inner_btn.bind("<Leave>", on_leave)

    hole_btn = ttk.Button(
        mode_buttons_frame,
        text="Inner+Hole",
        style="Mode.TButton",
        takefocus=0,
        command=lambda: select_mode("Inner+Hole"),
        width=10
    )
    hole_btn.pack(side="left", padx=30)
    hole_btn.bind("<Enter>", on_inner_hole_enter)
    hole_btn.bind("<Leave>", on_leave)

    style.configure("Detail.TFrame", background="#F0F0F0", borderwidth=2, relief="ridge")
    detail_frame = ttk.Frame(root, style="Detail.TFrame")

    for col_idx in range(4):
        detail_frame.columnconfigure(col_idx, weight=1 if col_idx == 1 else 0)

    back_button = ttk.Button(detail_frame, text="← Back", command=go_back_to_mode, width=10)
    back_button.grid(row=0, column=0, padx=10, pady=10, sticky='w')

    mode_label = tk.Label(detail_frame, text="", bg="#F0F0F0", fg="#333333", font=("Arial", 18, "bold"))
    mode_label.grid(row=0, column=1, padx=10, pady=10, sticky='w', columnspan=3)

    lbl_infolder = ttk.Label(detail_frame, text="Input Folder:")
    lbl_infolder.grid(row=1, column=0, sticky="w", padx=10, pady=(10,5))

    input_folder_entry = ttk.Entry(detail_frame, width=50)
    input_folder_entry.grid(row=1, column=1, sticky="ew", pady=(10,5))

    def pick_in_folder():
        folder_ = filedialog.askdirectory(title="Select Input Folder")
        if folder_:
            input_folder_entry.delete(0, tk.END)
            input_folder_entry.insert(0, folder_)

    btn_infolder = ttk.Button(detail_frame, text="Select", command=pick_in_folder, width=10)
    btn_infolder.grid(row=1, column=2, padx=10, pady=(10,5), sticky="w")

    input_folder_entry.drop_target_register(DND_FILES)
    input_folder_entry.dnd_bind('<<Drop>>', drop_folder)

    lbl_files = ttk.Label(detail_frame, text="Input Files:")
    lbl_files.grid(row=2, column=0, sticky="nw", padx=10, pady=(10,5))

    file_listbox = tk.Listbox(detail_frame, width=50, height=8, bg="#FFFFFF")
    file_listbox.grid(row=2, column=1, rowspan=3, sticky="nsew", pady=(10,5))

    def add_files_():
        global input_files
        files = filedialog.askopenfilenames(
            title="Select Files",
            filetypes=[("STL files", "*.stl"), ("All Files", "*.*")]
        )
        for f_ in files:
            if f_ not in input_files:
                input_files.append(f_)
                file_listbox.insert(tk.END, f_)

    btn_add = ttk.Button(detail_frame, text="Add", command=add_files_, width=10)
    btn_add.grid(row=2, column=2, padx=10, pady=(10,5), sticky="w")

    def remove_selected_file_():
        global input_files
        selected = file_listbox.curselection()
        for index in reversed(selected):
            file_listbox.delete(index)
            del input_files[index]

    btn_del = ttk.Button(detail_frame, text="Remove", command=remove_selected_file_, width=10)
    btn_del.grid(row=3, column=2, padx=10, pady=(5,5), sticky="w")

    def clear_files_():
        global input_files
        file_listbox.delete(0, tk.END)
        input_files.clear()

    btn_clear = ttk.Button(detail_frame, text="Clear", command=clear_files_, width=10)
    btn_clear.grid(row=4, column=2, padx=10, pady=(5,5), sticky="w")

    lbl_outfolder = ttk.Label(detail_frame, text="Output Folder:")
    lbl_outfolder.grid(row=5, column=0, sticky="w", padx=10, pady=(10,5))

    output_folder_entry = ttk.Entry(detail_frame, width=50)
    output_folder_entry.grid(row=5, column=1, sticky="ew", pady=(10,5))

    def pick_out_folder():
        of = filedialog.askdirectory(title="Select Output Folder")
        if of:
            output_folder_entry.delete(0, tk.END)
            output_folder_entry.insert(0, of)

    btn_outfolder = ttk.Button(detail_frame, text="Select", command=pick_out_folder, width=10)
    btn_outfolder.grid(row=5, column=2, padx=10, pady=(10,5), sticky="w")

    save_in_original_var = tk.BooleanVar(value=cfg.get("save_in_original", False))
    chk_original = ttk.Checkbutton(detail_frame, text="Save in Original Folder",
                                   variable=save_in_original_var)
    chk_original.grid(row=5, column=3, sticky="w", padx=(5,10), pady=(10,5))

    def on_save_in_original_changed(*args):
        if save_in_original_var.get():
            output_folder_entry.config(state="disabled")
            btn_outfolder.config(state="disabled")
        else:
            output_folder_entry.config(state="normal")
            btn_outfolder.config(state="normal")

    save_in_original_var.trace_add("write", on_save_in_original_changed)
    on_save_in_original_changed()

    lbl_cement = ttk.Label(detail_frame, text="Cement Thickness(µm):")
    cement_entry = ttk.Entry(detail_frame, width=10, font=("Arial", 12))

    lbl_margin = ttk.Label(detail_frame, text="Margin Protect(mm):")
    margin_protect_entry = ttk.Entry(detail_frame, width=10, font=("Arial", 12))

    lbl_hole = ttk.Label(detail_frame, text="Hole Diameter(mm):")
    hole_dia_entry = ttk.Entry(detail_frame, width=10, font=("Arial", 12))

    progress_bar = ttk.Progressbar(detail_frame, orient="horizontal", length=300, mode="determinate")
    progress_bar.grid(row=10, column=0, columnspan=2, pady=10, padx=10, sticky="ew")

    progress_label = ttk.Label(detail_frame, text="Progress: 0%")
    progress_label.grid(row=10, column=2, sticky="w", padx=10, columnspan=2)

    btn_frame = ttk.Frame(detail_frame, style="Detail.TFrame")
    btn_frame.grid(row=11, column=0, columnspan=4, pady=10)

    style.configure("Action.TButton",
                    font=("Arial", 14, "bold"),
                    padding=10,
                    relief="raised",
                    borderwidth=3,
                    background="#FFFFFF",
                    foreground="#000000")
    style.map("Action.TButton",
        background=[("active","#E8E8E8"),("pressed","#DDDDDD")],
        relief=[("pressed", "sunken")],
        focuscolor=[("focus", ""), ("!focus", "")]
    )

    def start_processing_():
        global global_stop_flag
        global selected_mode
        global input_files

        global_stop_flag = False

        folder_ = input_folder_entry.get().strip()
        if not folder_ and not input_files:
            messagebox.showerror("Error", "Input folder or files required.")
            return

        output_folder_ = output_folder_entry.get().strip()
        if not save_in_original_var.get() and not output_folder_:
            messagebox.showerror("Error", "Output folder is required (or check 'Save in Original').")
            return

        try:
            cement_val_ = float(cement_entry.get())
        except:
            cement_val_ = 0.0
        try:
            hole_val_ = float(hole_dia_entry.get())
        except:
            hole_val_ = 2.0
        try:
            margin_protect_val_ = float(margin_protect_entry.get())
        except:
            margin_protect_val_ = 0.3

        folder_files_ = []
        if folder_ and os.path.isdir(folder_):
            folder_files_ = [os.path.join(folder_, x) for x in os.listdir(folder_) if x.lower().endswith(".stl")]
        all_stls_ = list(set(folder_files_ + input_files))
        if not all_stls_:
            update_progress(100, "No STL found.")
            return

        save_in_original_ = save_in_original_var.get()
        mode_ = selected_mode

        update_progress(0, f"Starting {mode_}...")

        def worker():
            if mode_ == "Shrink":
                process_shrink(all_stls_, output_folder_, cement_val_, save_in_original_)
            elif mode_ == "Inner Only":
                process_inner_only(all_stls_, output_folder_, cement_val_, save_in_original_, margin_protect_val_)
            elif mode_ == "Inner+Hole":
                process_inner_hole(all_stls_, output_folder_, cement_val_, hole_val_, save_in_original_, margin_protect_val_)
            else:
                print("[DEBUG] Unknown mode")
            update_progress(100, f"{mode_} finished.")

        t_ = threading.Thread(target=worker)
        t_.start()

    def stop_processing_():
        global global_stop_flag
        global_stop_flag = True
        print("[INFO] Stop requested.")

    btn_start = ttk.Button(btn_frame, text="Start", style="Action.TButton",
                           command=start_processing_, takefocus=0, width=10)
    btn_start.pack(side="left", padx=20)

    btn_stop = ttk.Button(btn_frame, text="STOP", style="Action.TButton",
                          command=stop_processing_, takefocus=0, width=10)
    btn_stop.pack(side="left", padx=20)

    footer_frame = tk.Frame(root, bg="#FFFFFF")
    footer_frame.pack(side="bottom", fill="x")

    def load_and_scale_logo(path, scale=0.105):
        try:
            from PIL import Image, ImageTk
            from PIL.Image import Resampling
            logo_ = Image.open(path)
            w, h = logo_.size
            new_w, new_h = int(w * scale), int(h * scale)
            logo_ = logo_.resize((new_w, new_h), Resampling.LANCZOS)
            return ImageTk.PhotoImage(logo_)
        except:
            return None

    logo_img = load_and_scale_logo("logo.png", 0.105)
    if logo_img:
        logo_label = tk.Label(footer_frame, image=logo_img, bg="#FFFFFF")
        logo_label.image = logo_img
        logo_label.pack(side="left", anchor="w", padx=10, pady=5)

    footer_label = tk.Label(
        footer_frame,
        text="DLAS v1.0.6 © 2025 Dental Lab Automation Solution - All rights reserved.",
        bg="#FFFFFF",
        fg="#999999",
        font=("Arial", 9)
    )
    footer_label.pack(side="right", padx=10, pady=1)

    cement_entry.insert(0, str(cfg.get("cement_thickness", 200.0)))
    hole_dia_entry.insert(0, str(cfg.get("hole_diameter", 2.0)))
    margin_protect_entry.insert(0, str(cfg.get("margin_protect", 0.3)))

    root.mainloop()

def run():
    run_gui()

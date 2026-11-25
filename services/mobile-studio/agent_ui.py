"""Allowlisted Android UI observations/actions for a single approved AI publishing run.

Never makes network requests or runs arbitrary scripts on the phone.
This is device interaction, NOT anti-detection/fingerprint spoofing.
"""
import re
import xml.etree.ElementTree as ET

from fastapi import HTTPException
from pydantic import BaseModel, Field

MAX_NODES = 250
APPROVED_ACTIONS = {"tap", "swipe", "type", "back"}
BOUND_RE = re.compile(r"^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$")


class TapInput(BaseModel):
    x: int = Field(ge=0, le=3000)
    y: int = Field(ge=0, le=4000)


class SwipeInput(BaseModel):
    x1: int = Field(ge=0, le=3000)
    y1: int = Field(ge=0, le=4000)
    x2: int = Field(ge=0, le=3000)
    y2: int = Field(ge=0, le=4000)
    duration_ms: int = Field(default=400, ge=100, le=1500)


class TypeInput(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def ui_snapshot(exec_adb):
    result = exec_adb("shell", "uiautomator", "dump", "/sdcard/window.xml", timeout=20, allow_failure=True)
    if result.returncode != 0:
        raise HTTPException(503, "Android UI tree unavailable")
    xml = exec_adb("shell", "cat", "/sdcard/window.xml", timeout=15).stdout
    if len(xml) > 2_000_000:
        raise HTTPException(503, "Android UI tree too large")
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as error:
        raise HTTPException(503, "Android UI tree unreadable") from error

    nodes = []
    for element in root.iter("node"):
        if len(nodes) >= MAX_NODES:
            break
        props = element.attrib
        if not (props.get("text") or props.get("content-desc") or props.get("clickable") == "true"):
            continue
        bounds = props.get("bounds", "")
        match = BOUND_RE.match(bounds)
        x = y = None
        if match:
            x1, y1, x2, y2 = [int(n) for n in match.groups()]
            x, y = (x1 + x2) // 2, (y1 + y2) // 2
        nodes.append({
            "text": props.get("text", "")[:200],
            "description": props.get("content-desc", "")[:200],
            "resource_id": props.get("resource-id", "")[:150],
            "class_name": props.get("class", "")[:100],
            "clickable": props.get("clickable") == "true",
            "enabled": props.get("enabled") == "true",
            "center": None if x is None else {"x": x, "y": y},
        })
    return {"nodes": nodes, "node_count": len(nodes), "truncated": len(nodes) >= MAX_NODES}


def ui_tap(exec_adb, action: TapInput):
    exec_adb("shell", "input", "tap", str(action.x), str(action.y), timeout=12)
    return {"performed": "tap", "x": action.x, "y": action.y}


def ui_swipe(exec_adb, action: SwipeInput):
    exec_adb("shell", "input", "swipe", *(str(n) for n in (
        action.x1, action.y1, action.x2, action.y2, action.duration_ms,
    )), timeout=15)
    return {"performed": "swipe"}


def ui_type(exec_adb, action: TypeInput):
    # ADB input text uses %s for spaces. Reject non-ASCII and special shell-like
    # characters rather than silently mangling multilingual captions.
    # An IME / Appium send_keys is required for robust Unicode support.
    if not re.fullmatch(r"[A-Za-z0-9 .,!?@#:_\-/()+']+", action.text):
        raise HTTPException(422, "Text contains unsupported characters; Unicode IME is required")
    encoded = action.text.replace(" ", "%s")
    exec_adb("shell", "input", "text", encoded, timeout=20)
    return {"performed": "type", "characters": len(action.text)}


def ui_back(exec_adb):
    exec_adb("shell", "input", "keyevent", "KEYCODE_BACK", timeout=10)
    return {"performed": "back"}

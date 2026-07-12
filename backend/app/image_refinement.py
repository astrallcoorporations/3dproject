from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


@dataclass(frozen=True)
class RefinementSettings:
    contrast: float = 1.15
    cleanup: bool = True
    palette_size: int = 12


@dataclass(frozen=True)
class ImageMeta:
    width: int
    height: int


def _clean_linework(rgb: Image.Image) -> Image.Image:
    denoised = rgb.filter(ImageFilter.MedianFilter(size=3))
    grayscale = np.asarray(denoised.convert("L"), dtype=np.float32)
    local_light = np.asarray(
        denoised.convert("L").filter(ImageFilter.GaussianBlur(radius=2)), dtype=np.float32
    )
    line_mask = grayscale < (local_light - 7)
    pixels = np.asarray(denoised, dtype=np.float32)
    pixels[line_mask] *= 0.78
    pixels[~line_mask] = np.minimum(pixels[~line_mask] * 1.02, 255)
    return Image.fromarray(pixels.astype(np.uint8), "RGB")


def refine_image(
    source: Path, destination: Path, settings: RefinementSettings
) -> ImageMeta:
    if not 0.5 <= settings.contrast <= 2.0:
        raise ValueError("Contrast must be between 0.5 and 2.0.")
    if not 4 <= settings.palette_size <= 32:
        raise ValueError("Palette size must be between 4 and 32.")

    source_image = Image.open(source).convert("RGBA")
    alpha = source_image.getchannel("A")
    rgb = source_image.convert("RGB")
    if settings.cleanup:
        rgb = _clean_linework(rgb)
    rgb = ImageEnhance.Contrast(rgb).enhance(settings.contrast)
    rgb = ImageOps.autocontrast(rgb, cutoff=1)
    normalized = rgb.quantize(colors=settings.palette_size, method=Image.Quantize.MEDIANCUT)
    result = normalized.convert("RGB").convert("RGBA")
    result.putalpha(alpha)
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination, format="PNG")
    return ImageMeta(width=result.width, height=result.height)

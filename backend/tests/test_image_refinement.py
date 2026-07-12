from PIL import Image

from app.image_refinement import RefinementSettings, refine_image


def test_refinement_keeps_dimensions_and_transparency(tmp_path):
    source = tmp_path / "sketch.png"
    output = tmp_path / "cleaned.png"
    image = Image.new("RGBA", (32, 32), (240, 230, 210, 0))
    for index in range(6, 26):
        image.putpixel((index, index), (32, 26, 24, 255))
    image.save(source)

    metadata = refine_image(
        source,
        output,
        RefinementSettings(contrast=1.3, cleanup=True, palette_size=8),
    )

    result = Image.open(output).convert("RGBA")
    assert metadata.width == 32
    assert metadata.height == 32
    assert result.size == (32, 32)
    assert result.getpixel((0, 0))[3] == 0
    assert result.getpixel((12, 12))[3] == 255

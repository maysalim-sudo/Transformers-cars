import bpy
sc = bpy.data.scenes["Commercial"]
r = sc.render
s = r.image_settings
try:
    s.media_type = "VIDEO"
except (AttributeError, TypeError):
    pass
s.file_format = "FFMPEG"
r.ffmpeg.format = "MPEG4"
r.ffmpeg.codec = "H264"
r.ffmpeg.constant_rate_factor = "HIGH"
r.ffmpeg.audio_codec = "NONE"
r.filepath = r"C:\Users\Torinou\Desktop\Blender mcp test\suv_commercial.mp4"
r.use_file_extension = False
print("RENDER_SETUP", sc.name, r.engine, sc.frame_start, sc.frame_end)

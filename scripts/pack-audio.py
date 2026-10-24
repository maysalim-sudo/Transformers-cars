"""Pack a garage sound for the web with ffmpeg.

usage: python3 -I scripts/pack-audio.py <in> <out.mp3> [--mono] [--loop] [--trim <seconds>] [--fade <seconds>]

Trims leading/trailing silence, normalises to -16 LUFS with a -1 dBTP ceiling, and encodes MP3:
music 128 kbps stereo, effects (--mono) 96 kbps mono.
--trim  keep only the first <seconds> after the silence trim
--fade  fade out over the last <seconds> (one-shots that ring on)
--loop  make the end flow into the start: the last 50 ms are crossfaded with the first 50 ms
"""
import subprocess, sys, tempfile
from pathlib import Path

a = sys.argv[1:]
src, dest = a[0], a[1]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
mono = "--mono" in a
silence = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
chain = [silence]
if opt("--trim"):
    chain.append(f"atrim=0:{opt('--trim')}")
if opt("--fade"):
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True).stdout)
    end = float(opt("--trim") or dur)
    chain.append(f"afade=t=out:st={max(0.0, end - float(opt('--fade')))}:d={opt('--fade')}")
chain.append("loudnorm=I=-16:TP=-1:LRA=11")
Path(dest).parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    mid = str(Path(tmp) / "mid.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", ",".join(chain), "-ar", "44100", "-ac", "1" if mono else "2", mid], check=True)
    if "--loop" in a:
        # head = first 50 ms, body = the rest; the body's tail crossfades into the head so the seam is silent
        looped = str(Path(tmp) / "loop.wav")
        graph = "[0]asplit[a][b];[a]atrim=0:0.05,asetpts=PTS-STARTPTS[head];[b]atrim=0.05,asetpts=PTS-STARTPTS[body];[body][head]acrossfade=d=0.05:c1=tri:c2=tri"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mid, "-filter_complex", graph, looped], check=True)
        mid = looped
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mid, "-codec:a", "libmp3lame", "-b:a", "96k" if mono else "128k", dest], check=True)
print(dest, Path(dest).stat().st_size // 1024, "KB")

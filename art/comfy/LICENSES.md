# Licences of the generated garage assets

Everything in `public/garage/` that was generated (textures, music, sound effects) came from these local models,
run in ComfyUI on the owner's machine. Checked 2026-10-24; confirm on the official model pages before relying on it.

| Asset | Model | Licence | Commercial use of outputs |
| --- | --- | --- | --- |
| Floor, wall, street and showroom textures (`art/comfy/picked/`, baked into `garage.glb`) | Z-Image Turbo (Tongyi-MAI, Alibaba) | Apache 2.0 | Yes |
| Music bed and reveal sting (`public/garage/audio/music_*.mp3`) | ACE-Step 1.5 | MIT; the model card says generated music may be used commercially | Yes |
| Sound effects (`public/garage/audio/*.mp3`, all the other files) | Stable Audio Open 1.0 (Stability AI) | Stability AI Community License | Yes, for an organisation under US$1M annual revenue; above that an Enterprise licence is needed |
| Upscaling (texture candidates) | RealESRGAN x4plus | BSD 3-Clause | Yes |

Notes

- Stable Audio Open is a gated model: the owner accepted the licence on Hugging Face on 2026-10-24 (organisation "Salimos").
  If the business passes US$1M a year in revenue, the Community License stops covering it — revisit then.
- ACE-Step's developer says its training data is licensed, royalty-free, public domain or synthetic; that is their claim,
  not an audit, and there is no indemnity. The picked bed and sting are short, generic instrumental pieces.
- Sources: [Z-Image Turbo (DataLearner)](https://www.datalearner.com/en/ai-models/pretrained-models/z-image-turbo),
  [ACE-Step 1.5 card mirror](https://huggingface.co/EnderArcane-Studio/Ace-Step1.5),
  [Stable Audio Open 1.0](https://huggingface.co/stabilityai/stable-audio-open-1.0),
  [Stability AI licences](https://stability.ai/membership).

/**
 * Side-view geometry per car class (viewBox 1200×480, front to the left, ground at y=420).
 * The side artwork reads everything from here, so a new class is new shapes, not new code.
 */
export type SideGeometry = {
  /** full silhouette, arches cut out */
  sil: string;
  /** side glass (day-light opening) and its bright trim line */
  dlo: string;
  dloTrim: string;
  beltline: string;
  /** dark pillar shapes drawn over the side glass */
  pillars: string[];
  /** panel regions, clipped by `sil`, so outer edges may overshoot */
  panels: {
    bumper_front: string;
    hood: string;
    fender_front: string;
    door_front: string;
    door_rear?: string;
    fender_rear: string;
    roof: string;
    windshield: string;
    rear_window: string;
    trunk: string;
    bumper_rear: string;
  };
  creases: string[];
  /** wheel centres; `scale` is relative to the 88-unit sedan tyre */
  wheel: { front: number; rear: number; cy: number; scale: number };
  /** body-in-white lines shown once the panels lift away */
  structure: string[];
  mirror: { body: string; stem: string; hi: string; lo: string };
  headlight: { lens: string; led: string; dot: [number, number] };
  taillight: { lens: string; led: string };
  /** flush door handles: x, y, width */
  handles: { front: [number, number, number]; rear?: [number, number, number] };
  vent?: string;
  intake: string;
  intakeHi: string;
  splitter: string;
  rearHi: string;
  reflector: string;
  ducktail?: string;
  diffuser: { body: string; fins: number[]; tip: [number, number] };
  /** black plastic arch and sill cladding (SUV) */
  cladding?: boolean;
  /** body-coloured widebody arch flares and side skirts (muscle saloon) */
  flares?: boolean;
  /** open pickup bed: the body is hollowed between x0 and x1 down to the floor (y) */
  bed?: { x0: number; x1: number; floor: number };
  roofRail?: string;
  /** tube roll cage centreline over the bed (open path), built on both sides and joined across */
  cage?: string;
  /** roof light bar: front x, top y, depth along the car */
  lightBar?: [number, number, number];
  /** spare wheel on the tailgate: centre x, centre y, tyre radius */
  spare?: [number, number, number];
};

/**
 * Four-door sports saloon, muscle-car style: ~4.95 m long on a 3.05 m wheelbase, 1.39 m tall, upright
 * blunt nose, long flat hood, high straight beltline with shallow glass, fastback roof onto a short
 * deck with a ducktail spoiler, gill vent behind the front wheel, quad exhaust.
 */
export const sedanSide: SideGeometry = {
  sil: "M72 236 C200 230 360 222 470 214 C530 178 590 140 640 126 C700 114 780 112 850 122 C910 132 960 162 1002 194 L1110 198 L1132 188 L1138 196 L1134 208 C1142 240 1148 280 1146 316 C1144 342 1140 360 1132 372 L1021 374 A94 94 0 0 0 849 374 L350 374 A94 94 0 0 0 178 374 L70 372 C62 362 58 346 58 326 C58 296 62 262 72 236 Z",
  dlo: "M488 222 C540 186 596 148 644 134 C720 124 810 124 870 136 C910 146 948 172 972 204 L488 222 Z",
  dloTrim: "M488 222 C540 186 596 148 644 134 C720 124 810 124 870 136 C910 146 948 172 972 204",
  beltline: "M488 222 L972 204",
  pillars: ["M708 127 L724 126 L723 213 L708 214 Z"],
  panels: {
    bumper_front: "M0 0 L96 0 L96 250 C104 290 130 334 178 384 L178 480 L0 480 Z",
    hood: "M96 0 L478 0 L478 226 C380 232 240 244 96 250 Z",
    fender_front: "M96 250 C240 244 380 232 478 226 C474 270 476 330 482 362 L178 362 L178 384 C130 334 104 290 96 250 Z",
    door_front: "M478 224 L716 214 L719 362 L482 362 C476 330 474 270 478 226 Z",
    door_rear: "M719 214 L926 206 C918 266 896 322 870 362 L722 362 Z",
    fender_rear:
      "M926 206 L972 204 C948 172 910 146 870 136 L880 128 L1004 196 L1112 210 L1124 230 C1100 310 1060 350 1021 384 L1021 362 L870 362 C896 322 918 266 926 206 Z",
    roof: "M632 0 L880 0 L880 128 C820 122 720 122 644 130 L632 132 Z",
    windshield: "M460 0 L632 0 L632 124 C590 140 540 176 496 212 L460 212 Z",
    rear_window: "M880 0 L1010 0 L1004 196 L880 128 Z",
    trunk: "M1004 0 L1200 0 L1200 230 L1124 230 L1112 210 L1004 196 Z",
    bumper_rear: "M1124 230 L1200 230 L1200 480 L1021 480 L1021 384 C1060 350 1100 310 1124 230 Z",
  },
  creases: ["M90 248 C380 236 700 226 1130 224", "M200 330 C460 326 700 322 1000 318"],
  wheel: { front: 264, rear: 935, cy: 336, scale: 0.95 },
  structure: [
    "M482 224 L486 358 L868 358 L926 208",
    "M718 214 L722 358",
    "M90 238 L470 216 L488 222",
    "M928 208 L1130 222",
    "M178 362 L1021 358",
    "M490 224 C542 190 598 152 646 138 C720 128 810 128 868 140 C906 150 944 174 966 202",
  ],
  mirror: {
    stem: "M502 224 L510 216",
    body: "M478 218 C480 204 496 196 520 196 C534 197 539 206 533 214 C525 221 500 223 478 218 Z",
    hi: "M480 214 C502 217 522 216 532 211",
    lo: "M478 218 C500 223 525 221 533 214",
  },
  headlight: {
    lens: "M64 250 C90 246 130 244 168 244 C160 252 120 256 66 262 Z",
    led: "M70 254 C100 251 134 249 162 248",
    dot: [90, 254],
  },
  taillight: {
    lens: "M1092 214 L1136 216 L1138 232 L1090 228 Z",
    led: "M1096 220 L1136 222",
  },
  handles: { front: [628, 232, 40], rear: [840, 222, 36] },
  vent: "M380 256 L398 252 L400 298 L382 302 Z",
  intake: "M60 330 C88 334 124 338 156 340 L162 354 C124 356 88 354 64 350 Z",
  intakeHi: "M66 338 L154 344",
  splitter: "M66 372 C100 374 140 376 176 375",
  rearHi: "M1090 300 C1110 298 1130 296 1146 294",
  reflector: "M1096 330 L1142 327",
  ducktail: "M1100 196 C1114 192 1126 188 1134 186",
  diffuser: { body: "M1026 360 L1140 352 C1136 364 1130 374 1120 382 L1032 382 Z", fins: [1050, 1070, 1090, 1110], tip: [1124, 370] },
  flares: true,
};

/**
 * Five-door city hatchback, the everyday car in Tunisia: ~4.06 m long on a 2.56 m wheelbase,
 * 1.44 m tall, short overhangs, rising beltline, roof spoiler over an upright tailgate.
 */
export const hatchbackSide: SideGeometry = {
  sil: "M164 238 C250 226 370 214 462 204 C520 170 570 132 610 116 C690 104 800 103 900 110 C940 114 970 118 994 124 L998 136 C1010 162 1022 188 1032 210 C1044 228 1050 260 1049 296 C1048 330 1044 352 1036 368 L978.3 372 A86 86 0 0 0 815.7 372 L415.3 372 A86 86 0 0 0 252.7 372 L170 370 C160 362 154 344 153 322 C152 290 154 256 164 238 Z",
  dlo: "M480 206 C524 174 572 136 612 122 L900 120 C930 124 952 142 962 168 L964 188 L480 206 Z",
  dloTrim: "M480 206 C524 174 572 136 612 122 L900 120 C930 124 952 142 962 168 L964 188",
  beltline: "M480 206 L964 188",
  pillars: ["M700 121 L716 121 L715 198 L700 199 Z"],
  panels: {
    bumper_front: "M0 0 L172 0 L172 238 C182 280 206 324 253 380 L253 480 L0 480 Z",
    hood: "M172 0 L478 0 L478 206 C380 214 270 226 172 238 Z",
    fender_front: "M172 238 C270 226 380 214 478 206 C474 256 478 320 486 360 L253 360 L253 380 C206 324 182 280 172 238 Z",
    door_front: "M478 206 L708 198 L711 360 L486 360 C478 320 474 258 478 206 Z",
    door_rear: "M711 198 L898 190 C892 256 870 322 846 360 L714 360 Z",
    fender_rear:
      "M898 190 L964 188 L962 168 C952 142 930 124 900 120 L950 124 L986 128 L1010 210 C1020 232 1028 262 1030 286 C1024 320 1000 350 978 380 L978 360 L846 360 C870 322 892 256 898 190 Z",
    roof: "M606 0 L1000 0 L1000 140 L986 128 L950 124 L900 120 L612 120 L606 122 Z",
    windshield: "M450 0 L606 0 L606 116 C566 130 526 166 480 206 L450 206 Z",
    rear_window: "M986 128 L1200 128 L1200 210 L1010 210 Z",
    trunk: "M1010 210 L1200 210 L1200 286 L1030 286 C1028 262 1020 232 1010 210 Z",
    bumper_rear: "M1030 286 L1200 286 L1200 480 L978 480 L978 380 C1000 350 1024 320 1030 286 Z",
  },
  creases: ["M186 250 C400 234 700 224 1040 216", "M262 340 C460 336 700 332 960 328"],
  wheel: { front: 334, rear: 897, cy: 344, scale: 0.86 },
  structure: [
    "M482 208 L490 356 L842 356 L898 192",
    "M710 198 L714 356",
    "M186 242 L462 206 L480 206",
    "M900 190 L1030 210",
    "M262 360 L978 356",
    "M482 208 C526 178 574 140 614 126 L898 124 C926 128 948 146 958 170",
  ],
  mirror: {
    stem: "M494 208 L502 200",
    body: "M470 202 C472 188 488 180 512 180 C526 181 531 190 525 198 C517 205 492 207 470 202 Z",
    hi: "M472 198 C494 201 514 200 524 195",
    lo: "M470 202 C492 207 517 205 525 198",
  },
  headlight: {
    lens: "M158 258 C180 246 224 236 274 230 C266 240 234 252 164 276 Z",
    led: "M166 263 C194 252 234 242 268 234",
    dot: [196, 258],
  },
  taillight: {
    lens: "M1000 214 C1020 214 1036 216 1046 222 L1048 240 C1030 236 1012 232 998 230 Z",
    led: "M1004 220 C1022 220 1036 224 1046 230",
  },
  handles: { front: [636, 222, 40], rear: [836, 214, 36] },
  intake: "M156 330 C178 334 212 338 240 341 L246 354 C210 356 178 354 162 350 Z",
  intakeHi: "M162 338 L238 344",
  splitter: "M166 369 C190 371 220 372 250 371",
  rearHi: "M1000 300 C1020 298 1036 296 1048 294",
  reflector: "M1010 330 L1046 327",
  diffuser: { body: "M982 360 L1040 356 C1038 366 1034 374 1026 380 L986 380 Z", fins: [996, 1010, 1024], tip: [1028, 370] },
};

/**
 * Two-door widebody muscle fastback: ~4.78 m long on a 2.72 m wheelbase, 1.36 m tall, long hood,
 * upright shark nose, one long door, beltline kicking up to a small quarter window, fastback roof
 * onto a short deck with a ducktail, gill vent behind the front wheel, body-coloured arch flares.
 */
export const coupeSide: SideGeometry = {
  sil: "M90 244 C220 236 380 226 500 214 C556 182 612 146 662 128 C700 120 760 120 810 128 C880 140 950 176 1000 206 L1108 210 L1124 200 L1130 212 C1136 240 1140 280 1138 316 C1136 342 1132 360 1122 372 L961.5 376 A87 87 0 0 0 800.5 376 L363.5 376 A87 87 0 0 0 202.5 376 L90 374 C80 364 76 348 76 330 C76 300 80 266 90 244 Z",
  dlo: "M510 222 C558 188 610 150 662 136 C710 130 770 130 812 140 C850 148 880 168 902 204 L510 222 Z",
  dloTrim: "M510 222 C558 188 610 150 662 136 C710 130 770 130 812 140 C850 148 880 168 902 204",
  beltline: "M510 222 L902 204",
  pillars: ["M796 133 L810 136 L809 208 L796 209 Z"],
  panels: {
    bumper_front: "M0 0 L112 0 L112 256 C120 296 150 336 202 386 L202 480 L0 480 Z",
    hood: "M112 0 L506 0 L506 226 C390 236 240 246 112 256 Z",
    fender_front: "M112 256 C240 246 390 236 506 226 C502 272 504 330 510 364 L202 364 L202 386 C150 336 120 296 112 256 Z",
    door_front: "M506 222 L796 208 C790 268 772 330 760 364 L510 364 C504 330 502 272 506 226 Z",
    fender_rear:
      "M796 208 L902 204 C880 168 850 148 812 140 L850 146 L940 182 L1004 208 L1108 216 L1118 232 C1096 310 1050 350 961.5 386 L961.5 364 L760 364 C772 330 790 268 796 208 Z",
    roof: "M650 0 L850 0 L850 140 C800 130 720 128 666 132 L650 134 Z",
    windshield: "M480 0 L650 0 L650 128 C610 140 560 176 516 214 L480 214 Z",
    rear_window: "M850 0 L1010 0 L1004 208 L940 182 L850 146 Z",
    trunk: "M1004 0 L1200 0 L1200 232 L1118 232 L1108 216 L1004 208 Z",
    bumper_rear: "M1118 232 L1200 232 L1200 480 L961.5 480 L961.5 386 C1050 350 1096 310 1118 232 Z",
  },
  creases: ["M120 258 C400 246 700 236 1120 228", "M240 340 C460 336 700 332 940 328"],
  wheel: { front: 283, rear: 881, cy: 343, scale: 0.875 },
  structure: [
    "M508 224 L512 360 L758 360 L798 210",
    "M120 248 L500 216 L510 222",
    "M800 210 L1118 226",
    "M202 364 L961 360",
    "M512 224 C560 192 612 154 664 140 C712 134 770 134 810 144 C846 152 876 172 896 202",
  ],
  mirror: {
    stem: "M524 224 L532 216",
    body: "M500 218 C502 204 518 196 542 196 C556 197 561 206 555 214 C547 221 522 223 500 218 Z",
    hi: "M502 214 C524 217 544 216 554 211",
    lo: "M500 218 C522 223 547 221 555 214",
  },
  headlight: {
    lens: "M84 262 C110 256 150 252 196 250 C188 260 150 268 88 278 Z",
    led: "M92 266 C120 261 156 257 190 255",
    dot: [108, 264],
  },
  taillight: {
    lens: "M1096 222 L1132 224 L1134 246 L1094 242 Z",
    led: "M1100 230 L1132 232",
  },
  handles: { front: [690, 234, 40] },
  vent: "M396 262 L414 258 L416 304 L398 308 Z",
  intake: "M80 330 C104 334 140 338 176 340 L182 354 C140 356 104 354 84 350 Z",
  intakeHi: "M86 338 L174 344",
  splitter: "M86 372 C120 374 160 376 198 375",
  rearHi: "M1080 300 C1100 298 1120 296 1138 294",
  reflector: "M1090 330 L1134 327",
  ducktail: "M1092 210 C1106 206 1116 202 1126 200",
  diffuser: { body: "M968 362 L1128 354 C1124 366 1118 374 1108 382 L976 382 Z", fins: [1000, 1030, 1060, 1090], tip: [1110, 370] },
  flares: true,
};

/**
 * Compact crossover SUV, the family car seen everywhere in Tunisia: ~4.43 m long on a 2.67 m
 * wheelbase, 1.63 m tall, high hood, rising beltline, side glass tapering to a point at the rear,
 * roof sloping to a spoiler over a raked tailgate, black arch and sill cladding.
 */
export const suvSide: SideGeometry = {
  sil: "M130 214 C250 202 380 192 478 186 C530 150 596 92 650 72 C720 60 840 62 930 70 C980 76 1016 84 1040 94 L1046 106 C1058 128 1070 150 1080 172 C1088 196 1094 230 1094 270 C1094 320 1092 350 1084 372 L987 378 A90 90 0 0 0 823 378 L400 378 A90 90 0 0 0 236 378 L124 376 C114 368 110 350 110 330 C110 286 116 240 130 214 Z",
  dlo: "M486 190 C536 154 590 104 644 82 L910 74 C960 80 1004 104 1030 154 L486 190 Z",
  dloTrim: "M486 190 C536 154 590 104 644 82 L910 74 C960 80 1004 104 1030 154",
  beltline: "M486 190 L1030 154",
  pillars: ["M714 79 L730 79 L729 175 L714 176 Z", "M944 78 L958 80 L957 160 L944 160 Z"],
  panels: {
    bumper_front: "M0 0 L140 0 L140 214 C150 266 182 330 236 386 L236 480 L0 480 Z",
    hood: "M140 0 L484 0 L484 188 C380 194 260 204 140 214 Z",
    fender_front: "M140 214 C260 204 380 194 484 188 C480 240 482 320 490 366 L236 366 L236 386 C182 330 150 266 140 214 Z",
    door_front: "M484 190 L722 175 L725 366 L490 366 C482 320 480 240 484 190 Z",
    door_rear: "M725 175 L950 160 C944 240 920 320 890 366 L728 366 Z",
    fender_rear:
      "M950 160 L1030 154 C1004 104 960 80 910 74 L980 82 L1030 96 L1058 172 C1068 204 1076 244 1080 286 C1066 330 1030 360 987 386 L987 366 L890 366 C920 320 944 240 950 160 Z",
    roof: "M640 0 L1052 0 L1052 108 L1030 96 L980 82 L910 74 L644 80 L640 82 Z",
    windshield: "M470 0 L640 0 L640 76 C590 98 540 146 488 188 L470 188 Z",
    rear_window: "M1030 96 L1200 96 L1200 172 L1058 172 Z",
    trunk: "M1058 172 L1200 172 L1200 286 L1080 286 C1076 244 1068 204 1058 172 Z",
    bumper_rear: "M1080 286 L1200 286 L1200 480 L987 480 L987 386 C1030 360 1066 330 1080 286 Z",
  },
  creases: ["M150 226 C400 210 700 196 1080 178", "M250 330 C460 326 700 322 960 318"],
  wheel: { front: 318, rear: 905, cy: 341, scale: 0.9 },
  structure: [
    "M486 192 L492 362 L888 362 L950 164",
    "M724 176 L728 362",
    "M150 216 L470 190 L486 190",
    "M952 162 L1080 168",
    "M236 366 L987 362",
    "M488 192 C538 158 592 108 646 86 L908 78 C958 84 1000 108 1026 152",
  ],
  mirror: {
    stem: "M500 192 L508 184",
    body: "M476 186 C478 172 494 164 518 164 C532 165 537 174 531 182 C523 189 498 191 476 186 Z",
    hi: "M478 182 C500 185 520 184 530 179",
    lo: "M476 186 C498 191 523 189 531 182",
  },
  headlight: {
    lens: "M122 236 C154 224 202 214 262 206 C254 216 214 228 128 252 Z",
    led: "M130 240 C162 229 208 219 256 210",
    dot: [152, 236],
  },
  taillight: {
    lens: "M1034 180 C1054 176 1072 174 1084 176 L1088 194 C1070 192 1052 194 1032 196 Z",
    led: "M1038 186 C1056 182 1072 181 1086 184",
  },
  handles: { front: [650, 196, 40], rear: [870, 182, 36] },
  intake: "M112 322 C140 328 180 332 214 336 L220 350 C180 354 140 352 116 346 Z",
  intakeHi: "M118 330 L212 340",
  splitter: "M118 374 C150 376 190 378 230 377",
  rearHi: "M1040 300 C1060 298 1078 296 1092 294",
  reflector: "M1044 340 L1088 336",
  diffuser: { body: "M990 362 L1086 356 C1084 368 1078 376 1068 382 L996 382 Z", fins: [1012, 1032, 1052], tip: [1070, 370] },
  cladding: true,
  roofRail: "M666 64 C760 54 860 56 960 70",
};

/**
 * Two-door single-cab pickup, the everyday work truck: ~5.0 m long on a 2.7 m wheelbase, 1.80 m
 * tall, tall blunt nose, upright cab, long open bed behind it, high ground clearance, black arch
 * cladding. The tailgate is the `trunk` part and the bed sides are the rear quarter panels.
 */
export const pickupSide: SideGeometry = {
  sil: "M60 196 C160 192 300 188 420 182 C450 140 490 70 532 34 C600 28 680 28 724 30 C732 32 736 38 736 46 L740 160 L744 164 L1144 164 C1148 166 1150 170 1150 176 L1152 300 C1156 304 1158 310 1158 318 L1156 352 C1154 362 1148 370 1140 372 L982.5 372 A92 92 0 0 0 811.5 372 L388.5 372 A92 92 0 0 0 217.5 372 L70 372 C60 366 54 350 52 330 C50 290 52 230 60 196 Z",
  dlo: "M444 160 C470 120 504 70 538 44 L716 42 C722 44 724 50 724 56 L724 156 L444 160 Z",
  dloTrim: "M444 160 C470 120 504 70 538 44 L716 42 C722 44 724 50 724 56 L724 156",
  beltline: "M444 160 L724 156",
  pillars: [],
  panels: {
    bumper_front: "M0 0 L84 0 L84 200 C90 260 130 330 217.5 384 L217.5 480 L0 480 Z",
    hood: "M84 0 L428 0 L428 194 C320 198 190 202 84 208 Z",
    fender_front: "M84 208 C190 202 320 198 428 194 C424 250 426 320 432 360 L217.5 360 L217.5 384 C130 330 90 260 84 208 Z",
    door_front: "M440 160 L690 157 L692 360 L432 360 C426 320 424 250 428 194 Z",
    fender_rear: "M690 157 L726 156 L726 150 L1138 150 L1138 300 L1100 300 C1070 320 1030 350 982.5 384 L982.5 360 L692 360 Z",
    roof: "M524 0 L760 0 L760 40 L538 40 L524 44 Z",
    windshield: "M400 0 L524 0 L524 40 C490 80 456 140 434 184 L400 184 Z",
    rear_window: "M728 40 L760 40 L760 160 L732 160 Z",
    trunk: "M1138 150 L1200 150 L1200 300 L1138 300 Z",
    bumper_rear: "M1100 300 L1200 300 L1200 480 L982.5 480 L982.5 384 C1030 350 1070 320 1100 300 Z",
  },
  creases: ["M70 200 C300 192 700 180 1140 178", "M220 330 C460 326 700 322 980 320"],
  wheel: { front: 303, rear: 897, cy: 338, scale: 0.932 },
  structure: [
    "M440 162 L434 356 L692 356 L690 160",
    "M84 200 L420 184 L444 160",
    "M740 164 L1144 168",
    "M217 360 L982 356",
    "M446 162 C472 122 506 72 540 48 L714 46 C720 48 722 54 722 60 L722 156",
  ],
  mirror: {
    stem: "M452 162 L460 154",
    body: "M424 156 C426 138 444 128 472 128 C488 129 494 140 486 150 C478 158 450 162 424 156 Z",
    hi: "M426 152 C450 155 472 154 484 148",
    lo: "M424 156 C448 162 478 160 486 150",
  },
  headlight: {
    lens: "M56 214 C80 210 120 208 160 208 C154 218 116 224 58 230 Z",
    led: "M62 218 C90 215 124 213 154 212",
    dot: [80, 218],
  },
  taillight: {
    lens: "M1132 174 L1150 176 L1152 240 L1132 238 Z",
    led: "M1140 180 L1142 234",
  },
  handles: { front: [640, 176, 36] },
  intake: "M54 320 C80 324 120 328 160 330 L166 344 C120 346 80 344 58 340 Z",
  intakeHi: "M60 328 L158 334",
  splitter: "M62 370 C100 372 150 373 200 372",
  rearHi: "M1100 296 C1120 296 1140 296 1156 296",
  reflector: "M1110 330 L1154 328",
  diffuser: { body: "M990 360 L1150 356 C1148 366 1144 374 1136 380 L996 380 Z", fins: [], tip: [1130, 368] },
  cladding: true,
  bed: { x0: 750, x1: 1136, floor: 270 },
};

/**
 * Four-door double-cab pickup, the work-and-family truck: ~5.3 m long on a 3.09 m wheelbase,
 * 1.80 m tall, longer cab with two rows of doors, shorter open bed, black arch cladding.
 */
export const doublecabSide: SideGeometry = {
  sil: "M27 196 C127 192 267 188 387 182 C417 140 457 70 499 34 C580 28 700 28 788 30 C796 32 800 38 800 46 L804 160 L808 164 L1176 164 C1180 166 1182 170 1182 176 L1184 300 C1188 304 1190 310 1190 318 L1188 352 C1186 362 1180 370 1172 372 L1034.5 372 A92 92 0 0 0 863.5 372 L355.5 372 A92 92 0 0 0 184.5 372 L37 372 C27 366 21 350 19 330 C17 290 19 230 27 196 Z",
  dlo: "M410 160 C436 120 470 70 506 44 L784 42 C790 44 792 50 792 56 L792 156 L410 160 Z",
  dloTrim: "M410 160 C436 120 470 70 506 44 L784 42 C790 44 792 50 792 56 L792 156",
  beltline: "M410 160 L792 156",
  pillars: ["M598 43 L614 43 L614 158 L598 158 Z"],
  panels: {
    bumper_front: "M0 0 L51 0 L51 200 C57 260 97 330 184.5 384 L184.5 480 L0 480 Z",
    hood: "M51 0 L395 0 L395 194 C287 198 157 202 51 208 Z",
    fender_front: "M51 208 C157 202 287 198 395 194 C391 250 393 320 399 360 L184.5 360 L184.5 384 C97 330 57 260 51 208 Z",
    door_front: "M406 160 L604 158 L606 360 L399 360 C393 320 391 250 395 194 Z",
    door_rear: "M606 158 L790 156 C786 250 784 320 784 360 L608 360 Z",
    fender_rear: "M790 156 L794 156 L794 150 L1170 150 L1170 300 L1132 300 C1100 320 1060 350 1034.5 384 L1034.5 360 L784 360 C784 320 786 250 790 156 Z",
    roof: "M490 0 L830 0 L830 40 L506 40 L490 44 Z",
    windshield: "M367 0 L490 0 L490 40 C456 80 422 140 400 184 L367 184 Z",
    rear_window: "M794 40 L830 40 L830 160 L798 160 Z",
    trunk: "M1170 150 L1200 150 L1200 300 L1170 300 Z",
    bumper_rear: "M1132 300 L1200 300 L1200 480 L1034.5 480 L1034.5 384 C1070 350 1110 320 1132 300 Z",
  },
  creases: ["M37 200 C300 192 700 180 1172 178", "M190 330 C460 326 700 322 1030 320"],
  wheel: { front: 270, rear: 949, cy: 338, scale: 0.932 },
  structure: [
    "M408 162 L401 356 L784 356 L790 158",
    "M606 160 L608 356",
    "M51 200 L387 184 L410 160",
    "M808 164 L1176 168",
    "M184 360 L1034 356",
    "M412 162 C438 122 472 72 508 48 L782 46 C788 48 790 54 790 60 L790 156",
  ],
  mirror: {
    stem: "M418 162 L426 154",
    body: "M390 156 C392 138 410 128 438 128 C454 129 460 140 452 150 C444 158 416 162 390 156 Z",
    hi: "M392 152 C416 155 438 154 450 148",
    lo: "M390 156 C414 162 444 160 452 150",
  },
  headlight: {
    lens: "M23 214 C47 210 87 208 127 208 C121 218 83 224 25 230 Z",
    led: "M29 218 C57 215 91 213 121 212",
    dot: [47, 218],
  },
  taillight: {
    lens: "M1164 174 L1182 176 L1184 240 L1164 238 Z",
    led: "M1172 180 L1174 234",
  },
  handles: { front: [540, 178, 36], rear: [730, 174, 34] },
  intake: "M21 320 C47 324 87 328 127 330 L133 344 C87 346 47 344 25 340 Z",
  intakeHi: "M27 328 L125 334",
  splitter: "M29 370 C67 372 117 373 167 372",
  rearHi: "M1132 296 C1152 296 1172 296 1188 296",
  reflector: "M1142 330 L1186 328",
  diffuser: { body: "M1042 360 L1182 356 C1180 366 1176 374 1168 380 L1048 380 Z", fins: [], tip: [1162, 368] },
  cladding: true,
  bed: { x0: 814, x1: 1168, floor: 270 },
};

/**
 * Lifted off-road extended-cab truck: ~5.1 m long on a 3.2 m wheelbase, 0.93 m tyres, ~0.38 m under
 * the rockers, tall flat hood, door plus small rear quarter window, short open bed with a tube roll
 * cage rising behind the cab, roof light bar, black arch flares.
 */
export const offroadSide: SideGeometry = {
  sil: "M50 168 C150 164 280 160 380 156 C410 116 446 64 480 34 C560 28 660 28 724 30 C732 32 736 38 736 46 L740 150 L744 154 L1152 154 C1156 156 1158 160 1158 166 L1160 270 C1164 274 1166 280 1166 288 L1164 318 C1162 328 1156 334 1148 336 L1045.5 336 A112 112 0 0 0 824.5 336 L334.5 336 A112 112 0 0 0 113.5 336 L54 336 C46 330 42 316 40 298 C38 260 40 200 50 168 Z",
  dlo: "M392 150 C418 112 448 70 484 44 L716 42 C722 44 724 50 724 56 L724 146 L392 150 Z",
  dloTrim: "M392 150 C418 112 448 70 484 44 L716 42 C722 44 724 50 724 56 L724 146",
  beltline: "M392 150 L724 146",
  pillars: ["M604 43 L620 43 L620 148 L604 148 Z"],
  panels: {
    bumper_front: "M0 0 L60 0 L60 172 C66 230 80 300 113.5 348 L113.5 480 L0 480 Z",
    hood: "M60 0 L388 0 L388 168 C280 172 170 176 60 182 Z",
    fender_front: "M60 182 C170 176 280 172 388 168 C384 220 386 290 392 326 L113.5 326 L113.5 348 C80 300 66 230 60 182 Z",
    door_front: "M388 150 L608 147 L610 326 L392 326 C386 290 384 220 388 168 Z",
    fender_rear: "M608 147 L726 146 L726 140 L1148 140 L1148 270 L1110 270 C1080 290 1060 320 1045.5 348 L1045.5 326 L610 326 Z",
    roof: "M470 0 L760 0 L760 40 L486 40 L470 44 Z",
    windshield: "M360 0 L470 0 L470 40 C440 76 410 124 394 150 L360 150 Z",
    rear_window: "M728 40 L760 40 L760 150 L732 150 Z",
    trunk: "M1148 140 L1200 140 L1200 270 L1148 270 Z",
    bumper_rear: "M1110 270 L1200 270 L1200 480 L1045.5 480 L1045.5 348 C1060 320 1080 290 1110 270 Z",
  },
  creases: ["M60 180 C300 172 700 160 1150 160", "M140 300 C400 296 700 292 1000 290"],
  wheel: { front: 224, rear: 935, cy: 318, scale: 1.16 },
  structure: [
    "M390 152 L394 322 L610 322 L608 148",
    "M60 172 L380 158 L392 150",
    "M744 154 L1152 158",
    "M113 326 L1045 322",
    "M394 152 C420 114 450 72 486 48 L714 46 C720 48 722 54 722 60 L722 146",
  ],
  mirror: {
    stem: "M400 152 L408 144",
    body: "M372 146 C374 128 392 118 420 118 C436 119 442 130 434 140 C426 148 398 152 372 146 Z",
    hi: "M374 142 C398 145 420 144 432 138",
    lo: "M372 146 C396 152 426 150 434 140",
  },
  headlight: {
    lens: "M46 186 C70 182 106 180 140 180 C134 190 100 196 48 202 Z",
    led: "M52 190 C78 187 108 185 134 184",
    dot: [70, 190],
  },
  taillight: {
    lens: "M1140 164 L1158 166 L1160 230 L1140 228 Z",
    led: "M1148 170 L1150 224",
  },
  handles: { front: [560, 166, 36] },
  intake: "M42 280 C60 284 80 288 96 290 L100 304 C80 306 60 304 44 300 Z",
  intakeHi: "M46 288 L94 294",
  splitter: "M46 334 C70 336 90 338 110 337",
  rearHi: "M1110 266 C1130 266 1150 266 1164 266",
  reflector: "M1120 300 L1164 298",
  diffuser: { body: "M1050 326 L1162 322 C1160 330 1156 336 1148 340 L1056 340 Z", fins: [], tip: [1140, 332] },
  cladding: true,
  bed: { x0: 750, x1: 1146, floor: 250 },
  cage: "M752 154 L752 20 C752 14 756 12 762 12 L860 12 C868 12 872 16 876 22 L1060 154",
  lightBar: [484, 30, 34],
};

/**
 * Four-door widebody desert truck, a full-size performance pickup: ~5.89 m long on a 3.69 m
 * wheelbase, 2.03 m tall, ~2.2 m wide, 0.94 m tyres, high rockers, tall flat hood with fender vents,
 * crew cab, short open bed, big black arch flares. Too long for the 1200-unit frame, so it is drawn
 * at 88% and the model's `scale` brings it back to true size in 3D.
 */
export const desertSide: SideGeometry = {
  sil: "M40 160 C150 156 290 150 400 144 C430 108 466 60 506 32 C590 26 720 26 796 28 C804 30 808 36 808 44 L812 144 L816 148 L1162 148 C1166 150 1168 154 1168 160 L1170 262 C1174 266 1176 272 1176 280 L1174 318 C1172 330 1166 338 1158 340 L1034.4 340 A101 101 0 0 0 833.6 340 L320.4 340 A101 101 0 0 0 119.6 340 L46 340 C38 334 34 318 32 300 C30 250 32 196 40 160 Z",
  dlo: "M410 144 C438 108 472 64 512 44 L790 42 C796 44 798 50 798 56 L798 140 L410 144 Z",
  dloTrim: "M410 144 C438 108 472 64 512 44 L790 42 C796 44 798 50 798 56 L798 140",
  beltline: "M410 144 L798 140",
  pillars: ["M604 43 L620 43 L620 142 L604 142 Z"],
  panels: {
    bumper_front: "M0 0 L50 0 L50 164 C56 230 74 300 119.6 352 L119.6 480 L0 480 Z",
    hood: "M50 0 L406 0 L406 156 C300 162 170 168 50 174 Z",
    fender_front: "M50 174 C170 168 300 162 406 156 C402 210 404 280 410 330 L119.6 330 L119.6 352 C74 300 56 230 50 174 Z",
    door_front: "M406 144 L608 142 L610 330 L410 330 C404 280 402 210 406 156 Z",
    door_rear: "M610 142 L796 140 C792 220 790 290 790 330 L612 330 Z",
    fender_rear: "M796 140 L800 140 L800 134 L1160 134 L1160 262 L1120 262 C1090 290 1060 320 1034.4 352 L1034.4 330 L790 330 C790 290 792 220 796 140 Z",
    roof: "M496 0 L830 0 L830 38 L512 38 L496 42 Z",
    windshield: "M370 0 L496 0 L496 38 C466 70 434 116 414 144 L370 144 Z",
    rear_window: "M800 38 L830 38 L830 144 L804 144 Z",
    trunk: "M1160 134 L1200 134 L1200 262 L1160 262 Z",
    bumper_rear: "M1120 262 L1200 262 L1200 480 L1034.4 480 L1034.4 352 C1060 320 1090 290 1120 262 Z",
  },
  creases: ["M50 172 C300 164 700 156 1160 156", "M150 300 C400 296 700 292 1030 290"],
  wheel: { front: 220, rear: 934, cy: 329, scale: 1.034 },
  structure: [
    "M408 146 L412 326 L790 326 L796 142",
    "M610 144 L612 326",
    "M50 164 L400 146 L410 144",
    "M816 148 L1162 152",
    "M119 330 L1034 326",
    "M412 146 C440 110 474 68 514 48 L788 46 C794 48 796 54 796 60 L796 140",
  ],
  mirror: {
    stem: "M418 146 L426 138",
    body: "M390 140 C392 122 410 112 438 112 C454 113 460 124 452 134 C444 142 416 146 390 140 Z",
    hi: "M392 136 C416 139 438 138 450 132",
    lo: "M390 140 C414 146 444 144 452 134",
  },
  headlight: {
    lens: "M38 172 C64 168 104 166 144 166 C138 176 102 182 40 188 Z",
    led: "M44 176 C72 173 106 171 138 170",
    dot: [62, 176],
  },
  taillight: {
    lens: "M1150 158 L1168 160 L1170 226 L1150 224 Z",
    led: "M1158 164 L1160 220",
  },
  handles: { front: [550, 160, 36], rear: [740, 156, 34] },
  vent: "M336 186 L354 182 L356 230 L338 234 Z",
  intake: "M34 270 C54 274 78 278 100 280 L104 294 C78 296 54 294 36 290 Z",
  intakeHi: "M38 278 L98 284",
  splitter: "M38 338 C64 340 90 342 116 341",
  rearHi: "M1124 258 C1144 258 1160 258 1174 258",
  reflector: "M1130 296 L1174 294",
  diffuser: { body: "M1040 330 L1172 326 C1170 336 1166 342 1158 346 L1046 346 Z", fins: [], tip: [1150, 336] },
  cladding: true,
  bed: { x0: 822, x1: 1158, floor: 236 },
};

/**
 * Boxy four-door trail 4x4: ~4.79 m long including the tailgate spare, 3.0 m wheelbase, 1.87 m tall,
 * 0.88 m tyres, tall flat hood, near-upright windscreen, flat hardtop, three side windows, black
 * flares, rock-rail height rockers. The front face is plain: no slotted grille.
 */
export const trailSide: SideGeometry = {
  sil: "M74 168 C170 166 290 164 380 160 C396 118 412 70 426 36 C430 32 434 30 440 30 L1056 30 C1062 30 1066 34 1066 40 L1068 300 C1074 304 1078 312 1078 320 L1076 336 C1074 340 1070 340 1066 340 L1014.8 340 A106 106 0 0 0 805.2 340 L352.8 340 A106 106 0 0 0 143.2 340 L70 340 C64 336 60 326 60 314 L60 300 C60 294 64 290 70 288 L72 200 C72 186 72 176 74 168 Z",
  dlo: "M392 148 C404 112 416 72 430 42 L1046 40 C1052 40 1054 44 1054 50 L1054 140 L392 148 Z",
  dloTrim: "M392 148 C404 112 416 72 430 42 L1046 40 C1052 40 1054 44 1054 50 L1054 140",
  beltline: "M392 148 L1054 140",
  pillars: ["M634 40 L650 40 L650 146 L634 146 Z", "M856 40 L872 40 L872 144 L856 144 Z"],
  panels: {
    bumper_front: "M0 0 L84 0 L84 172 C88 230 104 300 143.2 352 L143.2 480 L0 480 Z",
    hood: "M84 0 L388 0 L388 172 C290 176 180 178 84 180 Z",
    fender_front: "M84 180 C180 178 290 176 388 172 C384 220 386 290 392 330 L143.2 330 L143.2 352 C104 300 88 230 84 180 Z",
    door_front: "M386 148 L640 146 L642 330 L392 330 C386 290 384 220 388 172 Z",
    door_rear: "M642 146 L862 144 C858 220 846 290 820 330 L644 330 Z",
    fender_rear: "M862 144 L1056 140 L1056 300 L1030 300 C1024 316 1020 330 1014.8 352 L1014.8 330 L820 330 C846 290 858 220 862 144 Z",
    roof: "M420 0 L1080 0 L1080 38 L436 38 L420 42 Z",
    windshield: "M350 0 L420 0 L420 40 C410 70 398 120 390 148 L350 148 Z",
    rear_window: "M1052 38 L1080 38 L1080 140 L1056 140 Z",
    trunk: "M1056 140 L1200 140 L1200 300 L1056 300 Z",
    bumper_rear: "M1030 300 L1200 300 L1200 480 L1014.8 480 L1014.8 352 C1020 330 1024 316 1030 300 Z",
  },
  creases: ["M84 186 C300 182 700 176 1060 172", "M160 310 C400 308 700 306 1000 304"],
  wheel: { front: 248, rear: 910, cy: 324, scale: 1.09 },
  structure: [
    "M390 150 L394 326 L820 326 L862 146",
    "M642 148 L644 326",
    "M84 172 L380 162 L392 148",
    "M1060 146 L1066 300",
    "M143 330 L1014 326",
    "M394 150 C406 114 418 74 432 46 L1044 44 C1050 44 1052 48 1052 54 L1052 140",
  ],
  mirror: {
    stem: "M398 150 L406 142",
    body: "M372 144 C372 126 386 116 410 116 C424 116 430 126 426 136 C420 144 396 148 372 144 Z",
    hi: "M374 140 C396 143 416 142 424 136",
    lo: "M372 144 C394 148 420 146 426 136",
  },
  headlight: {
    lens: "M70 180 C76 178 84 178 92 180 C90 194 84 198 72 196 Z",
    led: "M74 184 L88 184",
    dot: [80, 188],
  },
  taillight: {
    lens: "M1052 170 L1066 170 L1066 228 L1052 228 Z",
    led: "M1058 176 L1058 222",
  },
  handles: { front: [580, 166, 30], rear: [800, 162, 30] },
  intake: "M60 296 L120 296 L124 318 L62 318 Z",
  intakeHi: "M62 302 L118 302",
  splitter: "M64 338 C90 340 116 341 140 340",
  rearHi: "M1030 296 C1050 296 1066 296 1076 296",
  reflector: "M1040 320 L1074 318",
  diffuser: { body: "M1020 330 L1076 326 C1074 334 1070 340 1062 344 L1026 344 Z", fins: [], tip: [1060, 336] },
  cladding: true,
  spare: [1096, 210, 96],
};

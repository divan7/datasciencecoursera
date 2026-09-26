import React from 'react'

type AnimCategory =
  | 'squat' | 'hinge' | 'push' | 'pull' | 'bridge'
  | 'plank' | 'lunge' | 'quadruped' | 'abduction' | 'extension'
  | 'cardio' | 'calf'

const MAP: Record<string, AnimCategory> = {
  cat_cow: 'quadruped', bird_dog: 'quadruped',
  glute_bridge: 'bridge', dead_bug: 'bridge', glute_bridge_single: 'bridge', hip_thrust: 'bridge',
  plank: 'plank', side_plank: 'plank', mountain_climber: 'plank',
  clamshell: 'abduction', side_lying_leg_raise: 'abduction',
  hip_hinge: 'hinge', romanian_deadlift: 'hinge',
  wall_sit: 'squat', squat_bodyweight: 'squat', goblet_squat: 'squat', leg_press: 'squat',
  superman: 'extension',
  step_up: 'lunge', reverse_lunge: 'lunge', bulgarian_split_squat: 'lunge',
  push_up: 'push', push_up_knee: 'push', pike_push_up: 'push',
  tricep_dip: 'push', dumbbell_bench_press: 'push', overhead_press: 'push',
  resistance_band_row: 'pull', nordic_curl: 'pull',
  lat_pulldown: 'pull', seated_cable_row: 'pull', face_pull: 'pull',
  walking_interval: 'cardio', jog_interval: 'cardio',
  standing_calf_raise: 'calf',
}

const B = '#94a3b8'
const A = '#22d3ee'
const DUR = '2s'
const KS = '0.45 0 0.55 1;0.45 0 0.55 1'
const KT = '0;0.5;1'

function A1({
  attr, from, to, dur = DUR,
}: {
  attr: string; from: number | string; to: number | string; dur?: string
}) {
  return (
    <animate
      attributeName={attr}
      values={`${from};${to};${from}`}
      keyTimes={KT}
      calcMode="spline"
      keySplines={KS}
      dur={dur}
      repeatCount="indefinite"
    />
  )
}

function Rot({ vals, children }: { vals: string; children: React.ReactNode }) {
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={vals}
        keyTimes={KT}
        calcMode="spline"
        keySplines={KS}
        dur={DUR}
        repeatCount="indefinite"
      />
      {children}
    </g>
  )
}

const SVGBase = ({ children }: { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 100 132"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: '100%', height: '100%' }}
  >
    {children}
  </svg>
)

const Gnd = ({ y = 124 }: { y?: number }) => (
  <line x1="12" y1={y} x2="88" y2={y} stroke={B} strokeWidth="1" strokeOpacity="0.25" />
)

// ─── SQUAT: hip drops, knee bends forward, foot stays on ground ──────────────
function SquatAnim() {
  return (
    <SVGBase>
      <Gnd />
      <circle cx="50" cy="14" r="9" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="23" x2="50" y2="42" stroke={B} strokeWidth="2.5" />
      {/* arm swings forward */}
      <line x1="50" y1="36" stroke={B} strokeWidth="2">
        <A1 attr="x2" from={37} to={27} /><A1 attr="y2" from={53} to={52} />
      </line>
      <line stroke={B} strokeWidth="2">
        <A1 attr="x1" from={37} to={27} /><A1 attr="y1" from={53} to={52} />
        <A1 attr="x2" from={34} to={20} /><A1 attr="y2" from={68} to={66} />
      </line>
      {/* lower spine → hip drops */}
      <line x1="50" y1="42" stroke={B} strokeWidth="2.5">
        <A1 attr="x2" from={50} to={54} /><A1 attr="y2" from={70} to={86} />
      </line>
      {/* thigh: hip→knee (accent) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={50} to={54} /><A1 attr="y1" from={70} to={86} />
        <A1 attr="x2" from={50} to={40} /><A1 attr="y2" from={97} to={100} />
      </line>
      {/* shin: knee→ankle, ankle fixed */}
      <line x2="52" y2="120" stroke={A} strokeWidth="3">
        <A1 attr="x1" from={50} to={40} /><A1 attr="y1" from={97} to={100} />
      </line>
      <line x1="52" y1="120" x2="70" y2="122" stroke={B} strokeWidth="2" />
    </SVGBase>
  )
}

// ─── HINGE: upper body pivots at hip (torso tilts forward) ───────────────────
function HingeAnim() {
  return (
    <SVGBase>
      <Gnd />
      <Rot vals="0 50 70;42 50 70;0 50 70">
        <circle cx="50" cy="14" r="9" stroke={B} strokeWidth="2.5" />
        <line x1="50" y1="23" x2="50" y2="70" stroke={B} strokeWidth="2.5" />
        <line x1="50" y1="38" x2="36" y2="56" stroke={A} strokeWidth="3" />
        <line x1="36" y1="56" x2="34" y2="70" stroke={A} strokeWidth="2.5" />
      </Rot>
      <line x1="50" y1="70" x2="50" y2="97" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="97" x2="52" y2="120" stroke={B} strokeWidth="2.5" />
      <line x1="52" y1="120" x2="70" y2="122" stroke={B} strokeWidth="2" />
    </SVGBase>
  )
}

// ─── PUSH: push-up side view, body translates up/down ────────────────────────
function PushAnim() {
  return (
    <SVGBase>
      <line x1="5" y1="112" x2="95" y2="112" stroke={B} strokeWidth="1" strokeOpacity="0.25" />
      {/* upper arm bends/extends (arm stays near ground) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={30} to={30} /><A1 attr="y1" from={88} to={105} />
        <A1 attr="x2" from={35} to={28} /><A1 attr="y2" from={112} to={112} />
      </line>
      {/* body rises and falls */}
      <Rot vals="0 50 112;0 50 112;0 50 112">
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;0,-16;0,0"
            keyTimes={KT}
            calcMode="spline"
            keySplines={KS}
            dur={DUR}
            repeatCount="indefinite"
          />
          <circle cx="16" cy="78" r="8" stroke={B} strokeWidth="2.5" />
          <line x1="16" y1="86" x2="70" y2="94" stroke={B} strokeWidth="2.5" />
          <line x1="70" y1="94" x2="80" y2="112" stroke={B} strokeWidth="2.5" />
        </g>
      </Rot>
    </SVGBase>
  )
}

// ─── PULL: row — arm extends and retracts ─────────────────────────────────────
function PullAnim() {
  return (
    <SVGBase>
      <Gnd />
      <circle cx="36" cy="18" r="9" stroke={B} strokeWidth="2.5" />
      <line x1="36" y1="27" x2="48" y2="70" stroke={B} strokeWidth="2.5" />
      {/* upper arm pulls */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={42} to={42} /><A1 attr="y1" from={42} to={42} />
        <A1 attr="x2" from={76} to={52} /><A1 attr="y2" from={50} to={56} />
      </line>
      {/* forearm */}
      <line stroke={A} strokeWidth="2.5">
        <A1 attr="x1" from={76} to={52} /><A1 attr="y1" from={50} to={56} />
        <A1 attr="x2" from={82} to={56} /><A1 attr="y2" from={64} to={68} />
      </line>
      <line x1="48" y1="70" x2="50" y2="97" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="97" x2="52" y2="120" stroke={B} strokeWidth="2.5" />
      <line x1="52" y1="120" x2="68" y2="122" stroke={B} strokeWidth="2" />
    </SVGBase>
  )
}

// ─── BRIDGE: lying on back, hip lifts ────────────────────────────────────────
function BridgeAnim() {
  return (
    <SVGBase>
      <line x1="5" y1="107" x2="95" y2="107" stroke={B} strokeWidth="1" strokeOpacity="0.25" />
      {/* head (stays near ground) */}
      <circle r="8" stroke={B} strokeWidth="2.5">
        <A1 attr="cx" from={16} to={16} /><A1 attr="cy" from={97} to={94} />
      </circle>
      {/* torso: shoulder(fixed)→hip(rises) */}
      <line stroke={B} strokeWidth="2.5">
        <A1 attr="x1" from={22} to={22} /><A1 attr="y1" from={105} to={103} />
        <A1 attr="x2" from={60} to={62} /><A1 attr="y2" from={105} to={84} />
      </line>
      {/* hip joint accent dot */}
      <circle r="5" fill="none" stroke={A} strokeWidth="2">
        <A1 attr="cx" from={60} to={62} /><A1 attr="cy" from={105} to={84} />
      </circle>
      {/* thigh: hip→knee (knee stays on ground) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={60} to={62} /><A1 attr="y1" from={105} to={84} />
        <A1 attr="x2" from={74} to={74} /><A1 attr="y2" from={105} to={105} />
      </line>
      {/* shin (vertical, from knee fixed) */}
      <line x1="74" y1="77" x2="74" y2="105" stroke={B} strokeWidth="2.5" />
    </SVGBase>
  )
}

// ─── PLANK: prone hold with subtle core pulse ─────────────────────────────────
function PlankAnim() {
  return (
    <SVGBase>
      <line x1="5" y1="112" x2="95" y2="112" stroke={B} strokeWidth="1" strokeOpacity="0.25" />
      <circle cx="12" cy="82" r="8" stroke={B} strokeWidth="2.5" />
      <line x1="20" y1="86" x2="72" y2="94" stroke={B} strokeWidth="2.5" />
      {/* forearms on ground */}
      <line x1="30" y1="90" x2="28" y2="112" stroke={A} strokeWidth="3" />
      <line x1="50" y1="93" x2="48" y2="112" stroke={A} strokeWidth="2.5" />
      {/* feet */}
      <line x1="72" y1="94" x2="80" y2="112" stroke={B} strokeWidth="2.5" />
      {/* core pulse indicator */}
      <circle cx="46" cy="91" r="4" fill={A} fillOpacity="0.15" stroke={A} strokeWidth="1.5">
        <A1 attr="r" from={4} to={6} dur="1.5s" />
        <animate attributeName="fillOpacity" values="0.15;0.4;0.15"
          dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines={KS} keyTimes={KT} />
      </circle>
    </SVGBase>
  )
}

// ─── LUNGE: front leg bends, back knee lowers ─────────────────────────────────
function LungeAnim() {
  return (
    <SVGBase>
      <Gnd />
      <circle cx="50" cy="14" r="9" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="23" x2="50" y2="70" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="38" x2="36" y2="55" stroke={B} strokeWidth="2" />
      <line x1="36" y1="55" x2="33" y2="70" stroke={B} strokeWidth="2" />
      {/* front leg: bends at knee (accent) */}
      <line x1="50" y1="70" x2="64" y2="97" stroke={A} strokeWidth="3" />
      <line x1="64" y1="97" x2="68" y2="122" stroke={A} strokeWidth="3" />
      {/* back leg: goes down */}
      <line x1="50" y1="70" x2="36" y2="94" stroke={B} strokeWidth="2.5" />
      <line stroke={B} strokeWidth="2.5">
        <A1 attr="x1" from={36} to={36} /><A1 attr="y1" from={94} to={94} />
        <A1 attr="x2" from={34} to={34} /><A1 attr="y2" from={118} to={112} />
      </line>
    </SVGBase>
  )
}

// ─── QUADRUPED: all-fours, opposite arm+leg extend ───────────────────────────
function QuadrupedAnim() {
  return (
    <SVGBase>
      <Gnd />
      {/* torso horizontal */}
      <line x1="22" y1="72" x2="68" y2="72" stroke={B} strokeWidth="2.5" />
      <circle cx="14" cy="72" r="8" stroke={B} strokeWidth="2.5" />
      {/* front arm (fixed, on ground) */}
      <line x1="30" y1="72" x2="28" y2="100" stroke={B} strokeWidth="2.5" />
      {/* back arm extends up/back (accent) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={62} to={62} /><A1 attr="y1" from={72} to={72} />
        <A1 attr="x2" from={60} to={80} /><A1 attr="y2" from={100} to={58} />
      </line>
      {/* front leg (fixed, on ground) */}
      <line x1="62" y1="72" x2="66" y2="100" stroke={B} strokeWidth="2.5" />
      {/* back leg extends up/back (accent) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={28} to={28} /><A1 attr="y1" from={72} to={72} />
        <A1 attr="x2" from={22} to={8} /><A1 attr="y2" from={100} to={58} />
      </line>
    </SVGBase>
  )
}

// ─── ABDUCTION: side-lying, top leg lifts ────────────────────────────────────
function AbductionAnim() {
  return (
    <SVGBase>
      <line x1="5" y1="106" x2="95" y2="106" stroke={B} strokeWidth="1" strokeOpacity="0.25" />
      <circle cx="14" cy="74" r="8" stroke={B} strokeWidth="2.5" />
      <line x1="22" y1="76" x2="68" y2="82" stroke={B} strokeWidth="2.5" />
      {/* bottom leg (fixed) */}
      <line x1="66" y1="82" x2="80" y2="104" stroke={B} strokeWidth="2.5" />
      {/* top leg lifts (accent) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={64} to={64} /><A1 attr="y1" from={80} to={80} />
        <A1 attr="x2" from={80} to={76} /><A1 attr="y2" from={100} to={72} />
      </line>
      <line x1="26" y1="78" x2="26" y2="100" stroke={B} strokeWidth="2" strokeOpacity="0.5" />
    </SVGBase>
  )
}

// ─── EXTENSION: prone, upper body lifts (superman) ───────────────────────────
function ExtensionAnim() {
  const H = 98
  return (
    <SVGBase>
      <line x1="5" y1={H + 2} x2="95" y2={H + 2} stroke={B} strokeWidth="1" strokeOpacity="0.25" />
      {/* upper body rotates up from hip */}
      <Rot vals={`0 52 ${H};-20 52 ${H};0 52 ${H}`}>
        <circle cx="18" cy={H - 10} r="8" stroke={B} strokeWidth="2.5" />
        <line x1="26" y1={H - 6} x2="52" y2={H} stroke={B} strokeWidth="2.5" />
        {/* arms extend forward (accent) */}
        <line x1="18" y1={H - 6} x2="4" y2={H - 14} stroke={A} strokeWidth="3" />
        <line x1="26" y1={H - 4} x2="10" y2={H - 10} stroke={A} strokeWidth="2.5" />
      </Rot>
      {/* lower body stays on ground */}
      <line x1="52" y1={H} x2="80" y2={H + 1} stroke={B} strokeWidth="2.5" />
      <line x1="80" y1={H + 1} x2="88" y2={H + 1} stroke={B} strokeWidth="2" />
    </SVGBase>
  )
}

// ─── CARDIO: walking figure, legs alternate ───────────────────────────────────
function CardioAnim() {
  return (
    <SVGBase>
      <Gnd />
      <circle cx="50" cy="14" r="9" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="23" x2="50" y2="70" stroke={B} strokeWidth="2.5" />
      {/* arm back */}
      <line stroke={B} strokeWidth="2">
        <A1 attr="x1" from={50} to={50} /><A1 attr="y1" from={38} to={38} />
        <A1 attr="x2" from={36} to={64} /><A1 attr="y2" from={56} to={56} />
      </line>
      {/* front leg (accent) swings forward */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={50} to={50} /><A1 attr="y1" from={70} to={70} />
        <A1 attr="x2" from={64} to={36} /><A1 attr="y2" from={97} to={97} />
      </line>
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={64} to={36} /><A1 attr="y1" from={97} to={97} />
        <A1 attr="x2" from={70} to={30} /><A1 attr="y2" from={122} to={122} />
      </line>
      {/* back leg */}
      <line stroke={B} strokeWidth="2.5">
        <A1 attr="x1" from={50} to={50} /><A1 attr="y1" from={70} to={70} />
        <A1 attr="x2" from={36} to={64} /><A1 attr="y2" from={95} to={95} />
      </line>
      <line stroke={B} strokeWidth="2.5">
        <A1 attr="x1" from={36} to={64} /><A1 attr="y1" from={95} to={95} />
        <A1 attr="x2" from={30} to={70} /><A1 attr="y2" from={122} to={122} />
      </line>
    </SVGBase>
  )
}

// ─── CALF RAISE: rises on tiptoes ────────────────────────────────────────────
function CalfAnim() {
  return (
    <SVGBase>
      <Gnd />
      <circle cx="50" cy="14" r="9" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="23" x2="50" y2="70" stroke={B} strokeWidth="2.5" />
      <line x1="50" y1="38" x2="36" y2="55" stroke={B} strokeWidth="2" />
      <line x1="36" y1="55" x2="33" y2="70" stroke={B} strokeWidth="2" />
      {/* thigh */}
      <line x1="50" y1="70" x2="50" y2="97" stroke={B} strokeWidth="2.5" />
      {/* shin lifts (accent) */}
      <line stroke={A} strokeWidth="3">
        <A1 attr="x1" from={50} to={50} /><A1 attr="y1" from={97} to={97} />
        <A1 attr="x2" from={52} to={52} /><A1 attr="y2" from={120} to={108} />
      </line>
      {/* foot angle changes: heel lifts, toe stays */}
      <line stroke={A} strokeWidth="2.5">
        <A1 attr="x1" from={52} to={52} /><A1 attr="y1" from={120} to={108} />
        <A1 attr="x2" from={66} to={58} /><A1 attr="y2" from={122} to={122} />
      </line>
    </SVGBase>
  )
}

const ANIMS: Record<AnimCategory, () => React.ReactElement> = {
  squat: SquatAnim,
  hinge: HingeAnim,
  push: PushAnim,
  pull: PullAnim,
  bridge: BridgeAnim,
  plank: PlankAnim,
  lunge: LungeAnim,
  quadruped: QuadrupedAnim,
  abduction: AbductionAnim,
  extension: ExtensionAnim,
  cardio: CardioAnim,
  calf: CalfAnim,
}

export function ExerciseAnimation({ exerciseId }: { exerciseId: string }) {
  const category = MAP[exerciseId] ?? 'squat'
  const Component = ANIMS[category]
  return (
    <div className="relative flex items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800"
      style={{ width: 140, height: 140 }}>
      <div style={{ width: 110, height: 110 }}>
        <Component />
      </div>
      <span className="absolute bottom-1 right-2 text-zinc-600 text-[9px] font-mono uppercase tracking-wide">
        {category}
      </span>
    </div>
  )
}

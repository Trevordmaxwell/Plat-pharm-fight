
const DEFAULT_BINDINGS = {
  p1: {
    left: ["KeyA"],
    right: ["KeyD"],
    up: ["KeyW"],
    down: ["KeyS"],
    light: ["KeyF"],
    heavy: ["KeyG"],
    special: ["KeyH"],
    guard: ["KeyE"],
  },
  p2: {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    light: ["KeyJ", "Numpad1", "Digit1"],
    heavy: ["KeyK", "Numpad2", "Digit2"],
    special: ["KeyL", "Numpad3", "Digit3"],
    guard: ["KeyI", "Numpad0", "Digit0"],
  },
  system: {
    pause: ["Escape"],
    confirm: ["Enter", "Space"],
  }
};


const clone = (v) => (globalThis.structuredClone ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v)));

export class InputManager{
  constructor(){
    this.keysDown = new Set();
    this.virtualDown = {
      1: { left:false, right:false, up:false, down:false, light:false, heavy:false, special:false, guard:false },
      2: { left:false, right:false, up:false, down:false, light:false, heavy:false, special:false, guard:false },
    };

    this.actions = {
      1: this._emptyState(),
      2: this._emptyState(),
      system: { pause:false, pausePressed:false, confirm:false, confirmPressed:false },
    };
    this.prevActions = clone(this.actions);

    this.bindings = clone(DEFAULT_BINDINGS);

    window.addEventListener("keydown", (e) => {
      this.keysDown.add(e.code);
      // Prevent page scrolling on arrows/space.
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)){
        e.preventDefault();
      }
    }, { passive:false });

    window.addEventListener("keyup", (e) => {
      this.keysDown.delete(e.code);
    });

    // To avoid "stuck key" when tab loses focus.
    window.addEventListener("blur", () => {
      this.keysDown.clear();
      for (const p of [1,2]){
        for (const k of Object.keys(this.virtualDown[p])) this.virtualDown[p][k] = false;
      }
    });
  }

  _emptyState(){
    return { left:false,right:false,up:false,down:false,light:false,heavy:false,special:false,guard:false,
      jumpPressed:false, lightPressed:false, heavyPressed:false, specialPressed:false, guardPressed:false };
  }

  setVirtual(player, action, down){
    if (!this.virtualDown[player]) return;
    if (!(action in this.virtualDown[player])) return;
    this.virtualDown[player][action] = !!down;
  }

  isAnyDown(codes){
    for (const c of codes){
      if (this.keysDown.has(c)) return true;
    }
    return false;
  }

  update(){
    // Copy current to prev
    this.prevActions = clone(this.actions);

    // Players
    for (const p of [1,2]){
      const keymap = (p === 1) ? this.bindings.p1 : this.bindings.p2;
      const v = this.virtualDown[p];

      const left = this.isAnyDown(keymap.left) || v.left;
      const right = this.isAnyDown(keymap.right) || v.right;
      const up = this.isAnyDown(keymap.up) || v.up;
      const down = this.isAnyDown(keymap.down) || v.down;

      const light = this.isAnyDown(keymap.light) || v.light;
      const heavy = this.isAnyDown(keymap.heavy) || v.heavy;
      const special = this.isAnyDown(keymap.special) || v.special;
      const guard = this.isAnyDown(keymap.guard) || v.guard;

      const prev = this.prevActions[p];
      const st = this.actions[p];
      st.left = left;
      st.right = right;
      st.up = up;
      st.down = down;
      st.light = light;
      st.heavy = heavy;
      st.special = special;
      st.guard = guard;

      st.jumpPressed = up && !prev.up;
      st.lightPressed = light && !prev.light;
      st.heavyPressed = heavy && !prev.heavy;
      st.specialPressed = special && !prev.special;
      st.guardPressed = guard && !prev.guard;
    }

    // System
    const sysPrev = this.prevActions.system;
    const sys = this.actions.system;
    sys.pause = this.isAnyDown(this.bindings.system.pause);
    sys.confirm = this.isAnyDown(this.bindings.system.confirm);
    sys.pausePressed = sys.pause && !sysPrev.pause;
    sys.confirmPressed = sys.confirm && !sysPrev.confirm;
  }
}

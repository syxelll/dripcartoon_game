// Source Jump: feet planted through frame 4; landing at frame 21 (30 fps).
export const JUMP_TAKEOFF=4/30;
export const JUMP_LANDING=21/30;
export const JUMP_END=25/30;
export const JUMP_FLIGHT=2*625/1550;
export function beginJump(f,strike=false){f.jumpPhase='prepare';f.jumpPrep=0;f.jumpLand=0;f.jumpAnimTime=0;f.jumpStrikeQueued=strike;f.airTime=0;f.vy=0}
export function advanceGroundJump(f,dt){
 if(f.jumpPhase==='prepare'){f.jumpPrep+=dt;f.jumpAnimTime=Math.min(f.jumpPrep,JUMP_TAKEOFF);if(f.jumpPrep+1e-8>=JUMP_TAKEOFF){f.jumpPhase='air';f.vy=-625;f.airTime=0;return 'takeoff'}return 'prepare'}
 if(f.jumpPhase==='land'){f.jumpLand+=dt;f.jumpAnimTime=Math.min(JUMP_END,JUMP_LANDING+f.jumpLand);if(f.jumpAnimTime+1e-8>=JUMP_END){f.jumpPhase='ground';f.jumpAnimTime=JUMP_END;return 'ready'}return 'land'}
 return 'ready';
}
export function advanceVertical(f,dt,floor){
 f.vy+=1550*dt;f.y=Math.min(floor,f.y+f.vy*dt);
 if(f.y===floor){f.vy=0;f.airTime=0;if(f.jumpPhase==='air'){f.jumpPhase='land';f.jumpLand=0;f.jumpAnimTime=JUMP_LANDING}}
 else{f.airTime+=dt;if(f.jumpPhase==='air')f.jumpAnimTime=JUMP_TAKEOFF+Math.min(1,f.airTime/JUMP_FLIGHT)*(JUMP_LANDING-JUMP_TAKEOFF)}
}

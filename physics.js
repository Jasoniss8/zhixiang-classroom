'use strict';

// SI coordinates and seconds. No canvas dimensions enter the equations.
window.ZhixiangPhysics = (() => {
  function dragRate(p) {
    return .5 * p.rho * p.cd * p.area / p.mass;
  }
  function acceleration(vx, vy, p) {
    const q = dragRate(p), speed = Math.hypot(vx, vy);
    return [-q * speed * vx, -p.g - q * speed * vy];
  }
  function projectileStep(s, dt, p) {
    const derivative = a => {
      const [ax, ay] = acceleration(a[2], a[3], p);
      return [a[2], a[3], ax, ay];
    };
    const add = (a, k, scale) => a.map((v, i) => v + scale * k[i]);
    const k1 = derivative(s), k2 = derivative(add(s, k1, dt / 2));
    const k3 = derivative(add(s, k2, dt / 2)), k4 = derivative(add(s, k3, dt));
    return s.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }
  function projectilePath(p, maxStep = 1 / 240) {
    const angle = p.angle * Math.PI / 180, vx = p.v * Math.cos(angle), vy = p.v * Math.sin(angle);
    const flight = (vy + Math.sqrt(vy * vy + 2 * p.g * p.height)) / p.g;
    const point = (s, t) => ({ t, x: s[0], y: s[1], vx: s[2], vy: s[3] });
    if (!dragRate(p)) {
      const count = Math.max(1, Math.ceil(flight / maxStep));
      const points = Array.from({ length: count + 1 }, (_, i) => {
        const t = flight * i / count;
        return point([vx * t, i === count ? 0 : Math.max(0, p.height + vy * t - .5 * p.g * t * t), vx, vy - p.g * t], t);
      });
      return { points, flight, range: vx * flight, peak: p.height + vy * vy / (2 * p.g), vx, vy, completed: true };
    }
    const points = [point([0, p.height, vx, vy], 0)];
    let s = [0, p.height, vx, vy], t = 0, peak = p.height;
    if (!flight) return { points, flight: 0, range: 0, peak, vx, vy, completed: true };
    // Refine an event within an RK4 step, rather than snapping to a frame.
    const eventTime = (before, dt, coordinate) => {
      let lo = 0, hi = dt;
      for (let i = 0; i < 36; i++) {
        const mid = (lo + hi) / 2;
        if (projectileStep(before, mid, p)[coordinate] > 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    while (t < 180) {
      const dt = Math.min(maxStep, 180 - t), next = projectileStep(s, dt, p);
      if (s[3] > 0 && next[3] <= 0) peak = Math.max(peak, projectileStep(s, eventTime(s, dt, 3), p)[1]);
      if (next[1] <= 0) {
        const landing = eventTime(s, dt, 1);
        s = projectileStep(s, landing, p); t += landing; s[1] = 0;
        points.push(point(s, t));
        return { points, flight: t, range: s[0], peak, vx, vy, completed: true };
      }
      t += dt; s = next; peak = Math.max(peak, s[1]); points.push(point(s, t));
    }
    return { points, flight: t, range: s[0], peak, vx, vy, completed: false };
  }
  function samplePath(path, time) {
    const pts = path.points;
    if (time <= 0) return pts[0];
    if (time >= path.flight) return pts[pts.length - 1];
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (pts[mid].t <= time) lo = mid; else hi = mid;
    }
    const a = pts[lo], b = pts[hi], f = (time - a.t) / (b.t - a.t);
    return { t: time, x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y), vx: a.vx + f * (b.vx - a.vx), vy: a.vy + f * (b.vy - a.vy) };
  }
  function pendulumStep(theta, omega, dt, p, damping = 0) {
    // Tangential viscous force F = -b v. b is kg/s; theta is radians.
    const acc = (a, v) => -p.g / p.length * Math.sin(a) - damping / p.mass * v;
    const k1x = omega, k1v = acc(theta, omega);
    const k2x = omega + dt * k1v / 2, k2v = acc(theta + dt * k1x / 2, k2x);
    const k3x = omega + dt * k2v / 2, k3v = acc(theta + dt * k2x / 2, k3x);
    const k4x = omega + dt * k3v, k4v = acc(theta + dt * k3x, k4x);
    return [theta + dt * (k1x + 2 * k2x + 2 * k3x + k4x) / 6, omega + dt * (k1v + 2 * k2v + 2 * k3v + k4v) / 6];
  }
  const MAX_STEP = 1 / 240;
  // Angle theta starts at the bottom: (x,y)=(r sin(theta),-r cos(theta)).
  function circularTension(p, theta, omega) {
    return p.mass * (p.radius * omega * omega + p.g * Math.cos(theta));
  }
  function circularInitial(p) {
    const theta = p.start === 'bottom' ? 0 : Math.PI, omega = p.omega;
    const slack = p.plane === 'vertical' && circularTension(p, theta, omega) < -1e-8 * p.mass * p.g;
    return {theta, omega, time:0, slack};
  }
  function circularAdvance(p, state, dt, maxStep = MAX_STEP) {
    if (state.slack || !(dt > 0)) return {...state};
    if (p.plane === 'horizontal') return {...state, time:state.time + dt};
    let s = {...state}, remaining = dt;
    // Energy conservation gives v_bottom² >= 5gr (or v_top² >= gr).
    // At the exact threshold, small RK4 energy drift must not trigger a
    // spurious release on a later revolution. Below it, locate T=0 normally.
    const completesCircle = p.radius*p.omega*p.omega >= (p.start === 'bottom' ? 5 : 1)*p.g - 1e-9*p.g;
    const step = (a, h) => pendulumStep(a.theta, a.omega, h, {length:p.radius,g:p.g,mass:p.mass});
    while (remaining > 1e-12) {
      const h = Math.min(remaining, maxStep, MAX_STEP), [theta, omega] = step(s, h);
      if (!completesCircle && circularTension(p, theta, omega) < -1e-8 * p.mass * p.g) {
        // Locate the loss of tension inside the integration step; freeze there.
        let lo = 0, hi = h;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2, a = step(s, mid);
          if (circularTension(p, a[0], a[1]) > 0) lo = mid; else hi = mid;
        }
        const event = (lo + hi) / 2, a = step(s, event);
        return {theta:a[0],omega:a[1],time:s.time + event,slack:true};
      }
      s = {theta,omega,time:s.time + h,slack:false}; remaining -= h;
    }
    return s;
  }
  function circularData(p, s = circularInitial(p)) {
    const vertical = p.plane === 'vertical', theta = vertical ? s.theta : p.omega * s.time;
    const omega = vertical ? s.omega : p.omega, r = p.radius;
    const x = r * Math.sin(theta), y = -r * Math.cos(theta), speed = Math.abs(omega) * r;
    const ac = omega * omega * r, force = p.mass * ac;
    return {...s,theta,omega,x,y,vx:r * omega * Math.cos(theta),vy:r * omega * Math.sin(theta),
      ax:-omega * omega * x,ay:-omega * omega * y,speed,ac,force,
      tension:vertical ? circularTension(p, theta, omega) : force,
      critical:Math.sqrt(p.g * r),bottomCritical:Math.sqrt(5 * p.g * r),
      energy:.5 * p.mass * speed * speed + (vertical ? p.mass * p.g * (y + r) : 0)};
  }

  // Fixed lab-frame initial centres and contact radius, all in metres.
  const COLLISION_GEOMETRY = Object.freeze({x1:-3,x2:3,radius:.25});
  function collisionSolution(p) {
    if (![p.mass1,p.mass2,p.u1,p.u2,p.e].every(Number.isFinite) || p.mass1<=0 || p.mass2<=0 || p.e<0 || p.e>1)
      return {valid:false,reason:'质量必须为正，速度须为有限数，恢复系数须在 0 到 1 之间。'};
    const totalMass=p.mass1+p.mass2,relativeSpeed=p.u1-p.u2;
    const totals=(v1,v2)=>({v1,v2,p1:p.mass1*v1,p2:p.mass2*v2,momentum:p.mass1*v1+p.mass2*v2,
      kinetic1:.5*p.mass1*v1*v1,kinetic2:.5*p.mass2*v2*v2,kinetic:.5*p.mass1*v1*v1+.5*p.mass2*v2*v2});
    const before=totals(p.u1,p.u2),centerVelocity=before.momentum/totalMass,collides=relativeSpeed>0;
    if (![totalMass,relativeSpeed,before.momentum,before.kinetic,centerVelocity].every(Number.isFinite))
      return {valid:false,reason:'参数超出可计算范围。'};
    if (!collides) return {valid:true,collides:false,relativeSpeed,centerVelocity,before,after:null,collisionTime:null,energyLoss:null,contact:null};
    const {x1,x2,radius}=COLLISION_GEOMETRY,collisionTime=(x2-x1-2*radius)/relativeSpeed;
    // Centre-of-mass decomposition solves momentum + Newton restitution.
    const after=totals(centerVelocity-p.e*p.mass2/totalMass*relativeSpeed,centerVelocity+p.e*p.mass1/totalMass*relativeSpeed);
    const energyLoss=.5*(p.mass1*p.mass2/totalMass)*(1-p.e)*(1+p.e)*relativeSpeed*relativeSpeed;
    const contact={x1:x1+p.u1*collisionTime,x2:x1+p.u1*collisionTime+2*radius};
    if (![collisionTime,after.kinetic,energyLoss,contact.x1,contact.x2].every(Number.isFinite))
      return {valid:false,reason:'参数超出可计算范围。'};
    return {valid:true,collides:true,relativeSpeed,centerVelocity,before,after,collisionTime,energyLoss,contact};
  }
  function collisionState(p,time=0,solution=collisionSolution(p)) {
    if (!solution.valid || !Number.isFinite(time) || time<0) return {valid:false,reason:solution.reason||'时间须为非负有限数。'};
    const collided=solution.collides&&time>=solution.collisionTime,values=collided?solution.after:solution.before;
    const dt=collided?time-solution.collisionTime:time,origin=collided?solution.contact:COLLISION_GEOMETRY;
    return {valid:true,time,collided,phase:!solution.collides?'separating':collided?'after':'before',
      x1:origin.x1+values.v1*dt,x2:origin.x2+values.v2*dt,...values};
  }

  // Single closed turn. Distances are metres; +normal points toward the viewer.
  const INDUCTION_GEOMETRY = Object.freeze({width:.2,height:.15,fieldWidth:.8,travel:.6,gapMin:.08,gapMax:.5,decayLength:.2});
  function inductionEvents(p) {
    if (p.scenario !== 'uniform') return [];
    const g=INDUCTION_GEOMETRY,half=g.width/2;
    const first=[-half,half,g.fieldWidth-half,g.fieldWidth+half].map(x=>
      p.period*Math.acos((g.fieldWidth/2-x)/g.travel)/(2*Math.PI));
    return [...first,...first.map(t=>p.period-t)].sort((a,b)=>a-b);
  }
  function inductionState(p,time=0) {
    if (!['magnet','uniform'].includes(p.scenario) || !['positive','negative'].includes(p.fieldSign) ||
        ![p.field,p.period,p.resistance,time].every(Number.isFinite) || p.field<0 || p.period<=0 || p.resistance<=0 || time<0)
      return {valid:false,reason:'B₀≥0，T、R>0，时间须为非负有限数。'};
    const g=INDUCTION_GEOMETRY,area=g.width*g.height,sign=p.fieldSign==='positive'?1:-1;
    const omega=2*Math.PI/p.period,phase=omega*time;
    const rawSin=Math.sin(phase),sin=Math.abs(rawSin)<1e-14?0:rawSin;
    let position,speed,flux,fluxRate,overlap=area,edge=false,field;
    if(p.scenario==='magnet'){
      const amplitude=(g.gapMax-g.gapMin)/2;
      position=(g.gapMax+g.gapMin)/2+amplitude*Math.cos(phase);
      speed=-amplitude*omega*sin;
      // Effective axial flux law, not a finite bar magnet field solution.
      const factor=1+(position/g.decayLength)**2;
      field=sign*p.field*factor**(-1.5);flux=area*field;
      fluxRate=-3*sign*p.field*area*position*speed/g.decayLength**2*factor**(-2.5);
    }else{
      position=g.fieldWidth/2-g.travel*Math.cos(phase);speed=g.travel*omega*sin;
      const left=position-g.width/2,right=position+g.width/2;
      overlap=g.height*Math.max(0,Math.min(g.fieldWidth,right)-Math.max(0,left));
      field=sign*p.field;flux=field*overlap;
      edge=p.field>0&&[-g.width/2,g.width/2,g.fieldWidth-g.width/2,g.fieldWidth+g.width/2].some(x=>Math.abs(position-x)<1e-12);
      const slope=g.height*((right>0&&right<g.fieldWidth?1:0)-(left>0&&left<g.fieldWidth?1:0));
      fluxRate=edge?null:field*slope*speed;
    }
    const emf=edge?null:-fluxRate,current=edge?null:emf/p.resistance;
    return {valid:true,time,position,speed,area,overlap,field,flux,fluxRate,emf,current,edge,
      direction:edge?'undefined':current===0?'none':current>0?'ccw':'cw'};
  }

  function doubleSlitParameters(p) {
    if(![p.wavelength,p.separation,p.distance,p.screenHalf].every(Number.isFinite) ||
       p.wavelength<=0 || p.separation<=0 || p.distance<=0 || p.screenHalf<=0)
      return {valid:false,reason:'波长、缝间距、缝屏距离与屏幕范围须为正数。'};
    const wavelength=p.wavelength*1e-9,separation=p.separation*1e-3,distance=p.distance,half=p.screenHalf*1e-3;
    return {valid:true,wavelength,separation,distance,half,spacing:wavelength*distance/separation,
      angleRatio:half/distance,slitRatio:separation/distance,smallAngle:half/distance<=.1&&separation/distance<=.01};
  }
  function doubleSlitAt(p,x) {
    const d=doubleSlitParameters(p);
    if(!d.valid||!Number.isFinite(x))return {valid:false};
    const pathDifference=d.separation*x/d.distance,phase=2*Math.PI*pathDifference/d.wavelength;
    // Rationalized subtraction avoids losing accuracy near the centre.
    const exactPathDifference=2*x*d.separation/(Math.hypot(d.distance,x+d.separation/2)+Math.hypot(d.distance,x-d.separation/2));
    let intensity=Math.cos(phase/2)**2;
    if(intensity<1e-24)intensity=0;else if(1-intensity<8*Number.EPSILON)intensity=1;
    return {valid:true,x,pathDifference,exactPathDifference,phase,intensity};
  }
  function doubleSlitPixelIntensity(p,left,right) {
    const d=doubleSlitParameters(p);
    if(!d.valid||![left,right].every(Number.isFinite)||right<left)return NaN;
    const halfPhase=Math.PI*(right-left)/d.spacing,midPhase=Math.PI*(right+left)/d.spacing;
    const sinc=Math.abs(halfPhase)<1e-8?1-halfPhase*halfPhase/6:Math.sin(halfPhase)/halfPhase;
    return Math.max(0,Math.min(1,.5+.5*Math.cos(midPhase)*sinc));
  }
  function wavelengthColor(wavelength) {
    if(!Number.isFinite(wavelength)||wavelength<380||wavelength>750)return [130,140,130];
    let r=0,g=0,b=0;
    if(wavelength<440){r=(440-wavelength)/60;b=1;}
    else if(wavelength<490){g=(wavelength-440)/50;b=1;}
    else if(wavelength<510){g=1;b=(510-wavelength)/20;}
    else if(wavelength<580){r=(wavelength-510)/70;g=1;}
    else if(wavelength<645){r=1;g=(645-wavelength)/65;}
    else r=1;
    const edge=wavelength<420?.3+.7*(wavelength-380)/40:wavelength>700?.3+.7*(750-wavelength)/50:1;
    return [r,g,b].map(v=>Math.round(255*(v*edge)**.8));
  }

  // Thin-lens sign convention: real object/image positive, virtual negative.
  function lensData(p) {
    if(!['convex','concave'].includes(p.kind)||![p.focal,p.objectDistance,p.objectHeight].every(Number.isFinite)||p.focal<=0||p.objectDistance<=0||p.objectHeight<=0)return {valid:false};
    const f=p.kind==='convex'?p.focal:-p.focal,u=p.objectDistance,h=p.objectHeight;
    const atFocus=Math.abs(u-f)<=16*Number.EPSILON*Math.max(1,u,Math.abs(f));
    const v=atFocus?null:f*u/(u-f),magnification=atFocus?null:-v/u;
    return {valid:true,f,u,h,atFocus,v,magnification,imageHeight:atFocus?null:magnification*h,real:atFocus?null:v>0,upright:atFocus?null:magnification>0};
  }
  function lensRays(p) {
    const d=lensData(p);if(!d.valid)return [];
    const rays=[{name:'平行光线',height:d.h,slope:-d.h/d.f},{name:'光心光线',height:0,slope:-d.h/d.u}];
    if(!d.atFocus)rays.push({name:'焦点光线',height:d.imageHeight,slope:0});
    return rays;
  }
  function oscillatorParameters(p) {
    const mode=p.springMode||'ideal',zeta=mode==='ideal'?0:mode==='critical'?1:p.zeta;
    if(![p.mass,p.stiff,p.amp,zeta].every(Number.isFinite)||p.mass<=0||p.stiff<=0||p.amp<0||zeta<0)return {valid:false};
    const omega0=Math.sqrt(p.stiff/p.mass),b=2*zeta*Math.sqrt(p.stiff*p.mass),forced=mode==='forced';
    if(forced&&(![p.driveFreq,p.driveForce].every(Number.isFinite)||p.driveFreq<0||p.driveForce<0))return {valid:false};
    return {valid:true,mode,zeta,omega0,b,beta:zeta*omega0,frequency0:omega0/(2*Math.PI),
      forced,driveOmega:forced?2*Math.PI*p.driveFreq:0,driveForce:forced?p.driveForce:0,
      regime:zeta===0?'无阻尼':zeta<1?'欠阻尼':zeta===1?'临界阻尼':'过阻尼'};
  }
  function oscillatorInitial(p){return {time:0,x:p.amp,v:0};}
  function oscillatorAdvance(p,state,dt,maxStep=MAX_STEP) {
    const d=oscillatorParameters(p);
    if(!d.valid||![state.time,state.x,state.v,dt,maxStep].every(Number.isFinite)||dt<0||maxStep<=0)return {valid:false};
    let s={...state},remaining=dt;
    const acceleration=(t,x,v)=>(d.driveForce*Math.cos(d.driveOmega*t)-d.b*v-p.stiff*x)/p.mass;
    while(remaining>1e-12){
      const h=Math.min(remaining,maxStep,MAX_STEP),{time:t,x,v}=s;
      const k1x=v,k1v=acceleration(t,x,v);
      const k2x=v+h*k1v/2,k2v=acceleration(t+h/2,x+h*k1x/2,k2x);
      const k3x=v+h*k2v/2,k3v=acceleration(t+h/2,x+h*k2x/2,k3x);
      const k4x=v+h*k3v,k4v=acceleration(t+h,x+h*k3x,k4x);
      s={time:t+h,x:x+h*(k1x+2*k2x+2*k3x+k4x)/6,v:v+h*(k1v+2*k2v+2*k3v+k4v)/6};remaining-=h;
    }
    return s;
  }
  function oscillatorReadings(p,s=oscillatorInitial(p)) {
    const d=oscillatorParameters(p);if(!d.valid)return d;
    const kinetic=.5*p.mass*s.v*s.v,potential=.5*p.stiff*s.x*s.x,drive=d.driveForce*Math.cos(d.driveOmega*s.time);
    return {...s,...d,kinetic,potential,total:kinetic+potential,force:-p.stiff*s.x,dampingForce:-d.b*s.v,drive,
      energyRate:drive*s.v-d.b*s.v*s.v,period:2*Math.PI/d.omega0};
  }
  function oscillatorEnvelope(p,time) {
    const d=oscillatorParameters(p);if(!d.valid||d.forced||!Number.isFinite(time)||time<0)return null;
    const a=Math.abs(p.amp),z=d.zeta,w=d.omega0;
    if(z<1)return a/Math.sqrt(1-z*z)*Math.exp(-z*w*time);
    if(z===1)return a*(1+w*time)*Math.exp(-w*time);
    const k=z+Math.sqrt(z*z-1),slow=-w/k,fast=-w*k;
    return a*(-fast*Math.exp(slow*time)+slow*Math.exp(fast*time))/(slow-fast);
  }
  function oscillatorResponse(p,frequency=p.driveFreq) {
    const d=oscillatorParameters(p);if(!d.valid||!Number.isFinite(frequency)||frequency<0)return {valid:false};
    const omega=2*Math.PI*frequency,re=p.stiff-p.mass*omega*omega,im=d.b*omega;
    const resonant=d.zeta===0&&Math.abs(re)<=32*Number.EPSILON*Math.max(p.stiff,p.mass*omega*omega);
    if(p.driveForce===0)return {valid:true,amplitude:0,phase:0,resonant:false};
    return {valid:true,amplitude:resonant?null:p.driveForce/Math.hypot(re,im),phase:Math.atan2(im,re),resonant};
  }

  const COULOMB_K = 8.99e9, CHARGE_CUTOFF = .16;
  const FIELD_BOUNDS = Object.freeze({xmin:-6,xmax:6,ymin:-4.5,ymax:4.5});
  function electricCharges(p) {
    return Array.from({length:Number(p.count)}, (_, i) => ({id:i+1,q:p['q'+(i+1)],x:p['x'+(i+1)],y:p['y'+(i+1)]}));
  }
  function electricField(charges, x, y, cutoff = CHARGE_CUTOFF) {
    let ex = 0, ey = 0, potential = 0;
    for (const charge of charges) {
      if (charge.q === 0) continue;
      const dx = x-charge.x, dy = y-charge.y, r2 = dx*dx+dy*dy;
      if (r2 <= cutoff*cutoff || r2 < 1e-24) return {valid:false,ex:NaN,ey:NaN,magnitude:NaN,potential:NaN};
      const r = Math.sqrt(r2), kq = COULOMB_K * charge.q * 1e-9;
      ex += kq*dx/(r2*r); ey += kq*dy/(r2*r); potential += kq/r;
    }
    return {valid:true,ex,ey,magnitude:Math.hypot(ex,ey),potential};
  }
  function traceFieldLine(charges, seed, direction = 1, bounds = FIELD_BOUNDS) {
    const points = [seed], active = charges.filter(c=>c.q!==0);
    let point = seed, length = 0, end = 'step-limit', target = null;
    const unit = q => {
      const f = electricField(active,q.x,q.y,0);
      return f.valid && f.magnitude > 1e-8 ? {x:direction*f.ex/f.magnitude,y:direction*f.ey/f.magnitude} : null;
    };
    const offset = (q,v,h) => ({x:q.x+v.x*h,y:q.y+v.y*h});
    for (let i=0;i<1400;i++) {
      const nearest = Math.min(...active.map(c=>Math.hypot(point.x-c.x,point.y-c.y)));
      const h = Math.min(.065,.23*nearest), a = unit(point);
      if (!a || !Number.isFinite(h)) {end='zero-field';break;}
      const b=unit(offset(point,a,h/2)),c=b&&unit(offset(point,b,h/2)),d=c&&unit(offset(point,c,h));
      if (!b || !c || !d) {end='zero-field';break;}
      const next={x:point.x+h*(a.x+2*b.x+2*c.x+d.x)/6,y:point.y+h*(a.y+2*b.y+2*c.y+d.y)/6};
      const hit=active.find(c=>Math.hypot(next.x-c.x,next.y-c.y)<=CHARGE_CUTOFF);
      if(hit){end='charge';target=hit.id;break;}
      if(next.x<bounds.xmin||next.x>bounds.xmax||next.y<bounds.ymin||next.y>bounds.ymax){end='boundary';break;}
      const stepLength=Math.hypot(next.x-point.x,next.y-point.y);
      if(stepLength<1e-7){end='zero-field';break;}
      points.push(next);point=next;length+=stepLength;
      if(length>=40){end='length-limit';break;}
    }
    return {points:direction===1?points:points.reverse(),end,target};
  }
  function electricFieldLines(charges) {
    const lines=[];
    for(const c of charges.filter(c=>c.q!==0)) {
      const count=Math.max(8,Math.min(24,Math.round(Math.abs(c.q)*12))),direction=Math.sign(c.q);
      for(let i=0;i<count;i++) {
        const angle=2*Math.PI*(i+.25)/count,seed={x:c.x+(CHARGE_CUTOFF+.012)*Math.cos(angle),y:c.y+(CHARGE_CUTOFF+.012)*Math.sin(angle)};
        const line=traceFieldLine(charges,seed,direction);
        // Positive seeds already cover connections to negative charges. Backwards
        // negative seeds supply lines entering from outside the drawing region.
        if(direction<0&&line.end==='charge')continue;
        if(line.points.length>2)lines.push({...line,source:c.id,direction});
      }
    }
    return lines;
  }
  function equipotentialContours(charges, levels, bounds = FIELD_BOUNDS, nx=120, ny=90) {
    const dx=(bounds.xmax-bounds.xmin)/nx,dy=(bounds.ymax-bounds.ymin)/ny;
    const grid=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>electricField(charges,bounds.xmin+i*dx,bounds.ymin+j*dy).potential));
    return levels.map(level=>{
      const segments=[];
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++) {
        const x=bounds.xmin+i*dx,y=bounds.ymin+j*dy;
        const values=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];
        if(values.some(v=>!Number.isFinite(v)))continue;
        const corners=[{x,y},{x:x+dx,y},{x:x+dx,y:y+dy},{x,y:y+dy}],crossings=[];
        for(let edge=0;edge<4;edge++) {
          const next=(edge+1)%4,v1=values[edge],v2=values[next];
          if((v1>level)===(v2>level))continue;
          const t=(level-v1)/(v2-v1),a=corners[edge],b=corners[next];
          crossings.push({edge,x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
        }
        if(crossings.length===2)segments.push(crossings);
        else if(crossings.length===4) {
          const center=electricField(charges,x+dx/2,y+dy/2).potential;
          const paired=((values[0]>level)===(center>level))?[[0,1],[2,3]]:[[3,0],[1,2]];
          for(const [a,b] of paired)segments.push([crossings[a],crossings[b]]);
        }
      }
      return {level,segments};
    });
  }

  const OBLIQUITY = 23.44, toRad = d=>d*Math.PI/180, toDeg = r=>r*180/Math.PI;
  function solarPosition(lat, dec, hour=12) {
    const phi=toRad(lat),delta=toRad(dec),hourAngle=toRad(15*(hour-12));
    const sine=Math.sin(phi)*Math.sin(delta)+Math.cos(phi)*Math.cos(delta)*Math.cos(hourAngle);
    return {elevation:toDeg(Math.asin(Math.max(-1,Math.min(1,sine)))),noon:90-Math.abs(lat-dec)};
  }
  function daylight(lat, dec) {
    const a=Math.sin(toRad(lat))*Math.sin(toRad(dec)),b=Math.cos(toRad(lat))*Math.cos(toRad(dec));
    if(Math.abs(b)<1e-12) {
      if(Math.abs(a)<1e-12)return {hours:null,status:'太阳中心全天位于地平线'};
      return {hours:a>0?24:0,status:a>0?'极昼':'极夜'};
    }
    const limit=-a/b;
    if(limit<=-1+1e-12)return {hours:24,status:'极昼'};
    if(limit>=1-1e-12)return {hours:0,status:'极夜'};
    return {hours:24*Math.acos(limit)/Math.PI,status:'有昼夜交替'};
  }
  const SOLAR_TERMS = Object.freeze(['春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒','立春','雨水','惊蛰']);
  // Representative dates only, not an ephemeris for any civil year.
  const TERM_DATES = [[3,20],[4,5],[4,20],[5,5],[5,21],[6,5],[6,21],[7,7],[7,23],[8,7],[8,23],[9,7],[9,23],[10,8],[10,23],[11,7],[11,22],[12,7],[12,21],[1,5],[1,20],[2,4],[2,19],[3,5],[3,20]];
  function seasonData(p) {
    const phase=((p.phase%360)+360)%360,lambda=toRad(phase),epsilon=toRad(OBLIQUITY);
    let dec=toDeg(Math.asin(Math.sin(epsilon)*Math.sin(lambda)));if(Math.abs(dec)<1e-12)dec=0;
    const index=Math.floor(phase/15),fraction=(phase%15)/15;
    const stamp=i=>Date.UTC(i>=19?2002:2001,TERM_DATES[i][0]-1,TERM_DATES[i][1]);
    const date=new Date(stamp(index)+(stamp(index+1)-stamp(index))*fraction);
    const day=daylight(p.lat,dec),sun=solarPosition(p.lat,dec,12);
    return {phase,dec,...sun,...day,polarBoundary:90-Math.abs(dec),
      term:SOLAR_TERMS[index],nextTerm:SOLAR_TERMS[(index+1)%24],onTerm:fraction<1e-8,
      date:`约 ${date.getUTCMonth()+1}月${date.getUTCDate()}日`,
      axis:[0,Math.sin(epsilon),Math.cos(epsilon)],sun:[Math.cos(lambda),Math.sin(lambda),0],earth:[-Math.cos(lambda),-Math.sin(lambda),0]};
  }
  function earthSurface(lat,lon) {
    const phi=toRad(lat),lambda=toRad(lon),epsilon=toRad(OBLIQUITY),c=Math.cos(phi),s=Math.sin(phi);
    return [c*Math.cos(lambda),c*Math.sin(lambda)*Math.cos(epsilon)+s*Math.sin(epsilon),-c*Math.sin(lambda)*Math.sin(epsilon)+s*Math.cos(epsilon)];
  }
  // Series RLC only. UI values are mH and microfarads; all calculations use SI.
  // Free response and established sinusoidal steady state are separate modes.
  function rlcParameters(p) {
    const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
    if (!p || !['free', 'steady'].includes(p.mode) || !inRange(p.resistance, 0, 500) ||
        !inRange(p.inductance, 10, 1000) || !inRange(p.capacitance, 1, 1000))
      return {valid:false,message:'串联 RLC 要求 R≥0、L>0、C>0，且参数在支持范围内。'};
    if (p.mode === 'free' && (!inRange(p.voltage0, -100, 100) || !inRange(p.current0, -10, 10)))
      return {valid:false,message:'初始电容电压须为 −100–100 V，初始电流须为 −10–10 A。'};
    if (p.mode === 'steady' && (p.resistance <= 0 || !inRange(p.driveVoltage, 0, 400) || !inRange(p.frequency, 1, 2000)))
      return {valid:false,message:'正弦稳态要求 R>0；电源峰值为 0–400 V，频率为 1–2000 Hz。'};
    const R=p.resistance,L=p.inductance*1e-3,C=p.capacitance*1e-6,
      omega0=1/Math.sqrt(L*C),alpha=R/(2*L),criticalResistance=2*Math.sqrt(L/C),delta=omega0*omega0-alpha*alpha;
    return {valid:true,R,L,C,omega0,f0:omega0/(2*Math.PI),alpha,criticalResistance,delta,
      regime:Math.abs(R-criticalResistance)<=1e-10*Math.max(1,criticalResistance)?'critical':delta>0?'under':'over',
      omegaD:delta>0?Math.sqrt(delta):null,qPeakOmega:omega0*omega0>2*alpha*alpha?Math.sqrt(omega0*omega0-2*alpha*alpha):null};
  }
  function rlcResponse(p, frequency=p.frequency) {
    const d=rlcParameters(p);
    if (!d.valid) return d;
    if (!(Number.isFinite(frequency)&&frequency>0) || !(d.R>0) || !(Number.isFinite(p.driveVoltage)&&p.driveVoltage>=0&&p.driveVoltage<=400))
      return {valid:false,message:'有限正弦稳态要求 R>0、频率为正且电源峰值有效。'};
    const omega=2*Math.PI*frequency,reactance=omega*d.L-1/(omega*d.C),impedance=Math.hypot(d.R,reactance),
      currentAmplitude=p.driveVoltage/impedance,phase=Math.atan2(reactance,d.R);
    if (![impedance,currentAmplitude,currentAmplitude/omega].every(Number.isFinite)) return {valid:false,message:'参数使稳态幅值超出有限数值范围，请增大电阻。'};
    return {...d,valid:true,frequency,omega,reactance,impedance,currentAmplitude,chargeAmplitude:currentAmplitude/omega,phase};
  }
  function rlcState(p, time) {
    const d=rlcParameters(p);
    if (!d.valid) return d;
    if (!Number.isFinite(time)||time<0) return {valid:false,message:'时间须为非负有限数。'};
    let q,current,sourceVoltage=0;
    if (p.mode==='steady') {
      const s=rlcResponse(p);
      if (!s.valid) return s;
      current=s.currentAmplitude*Math.cos(s.omega*time-s.phase);
      q=s.chargeAmplitude*Math.sin(s.omega*time-s.phase);
      sourceVoltage=p.driveVoltage*Math.cos(s.omega*time);
    } else {
      const q0=d.C*p.voltage0,i0=p.current0;
      let cosine,sine;
      if (d.delta>=0) {
        const z=Math.sqrt(d.delta)*time,decay=Math.exp(-d.alpha*time),sinc=Math.abs(z)<1e-5?1-z*z/6+z**4/120:Math.sin(z)/z;
        cosine=decay*Math.cos(z);sine=decay*time*sinc;
      } else {
        const beta=Math.sqrt(-d.delta),slow=-d.omega0*d.omega0/(d.alpha+beta),fast=-d.alpha-beta;
        const eSlow=Math.exp(slow*time),eFast=Math.exp(fast*time);
        cosine=(eSlow+eFast)/2;
        // expm1 keeps the difference accurate arbitrarily close to critical damping.
        sine=eSlow*(-Math.expm1(-2*beta*time))/(2*beta);
      }
      q=q0*cosine+(i0+d.alpha*q0)*sine;
      current=i0*cosine-(d.alpha*i0+d.omega0*d.omega0*q0)*sine;
    }
    const voltageC=q/d.C,voltageR=d.R*current,voltageL=sourceVoltage-voltageR-voltageC,
      energyL=.5*d.L*current*current,energyC=.5*q*q/d.C,energy=energyL+energyC,energyRate=sourceVoltage*current-d.R*current*current,
      initialEnergy=p.mode==='free'?.5*d.L*p.current0*p.current0+.5*d.C*p.voltage0*p.voltage0:null,
      dissipated=initialEnergy===null?null:Math.max(0,initialEnergy-energy);
    if (![q,current,voltageC,voltageL,energy,energyRate].every(Number.isFinite)) return {valid:false,message:'参数使电路读数超出有限数值范围，请增大电阻。'};
    return {...d,valid:true,time,q,current,voltageC,voltageR,voltageL,sourceVoltage,energy,energyRate,
      energyL,energyC,initialEnergy,dissipated,currentRate:voltageL/d.L};
  }
  function rlcDuration(p) {
    const d=rlcParameters(p);
    if (!d.valid) return 1;
    if (p.mode==='steady') return 6/p.frequency;
    if (d.delta>0 && Math.sqrt(d.delta)>.1*d.omega0) return 12*Math.PI/Math.sqrt(d.delta);
    if (d.delta<0) {
      const slow=d.omega0*d.omega0/(d.alpha+Math.sqrt(-d.delta));
      return 6/slow;
    }
    return 6/Math.max(d.alpha,.1*d.omega0);
  }
  return Object.freeze({ dragRate, acceleration, projectileStep, projectilePath, samplePath, pendulumStep,
    MAX_STEP,circularTension,circularInitial,circularAdvance,circularData,
    COLLISION_GEOMETRY,collisionSolution,collisionState,
    INDUCTION_GEOMETRY,inductionEvents,inductionState,doubleSlitParameters,doubleSlitAt,doubleSlitPixelIntensity,wavelengthColor,
    lensData,lensRays,oscillatorParameters,oscillatorInitial,oscillatorAdvance,oscillatorReadings,oscillatorEnvelope,oscillatorResponse,
    COULOMB_K,CHARGE_CUTOFF,FIELD_BOUNDS,electricCharges,electricField,traceFieldLine,electricFieldLines,equipotentialContours,
    OBLIQUITY,SOLAR_TERMS,solarPosition,daylight,seasonData,earthSurface,
    rlcParameters,rlcResponse,rlcState,rlcDuration });
})();

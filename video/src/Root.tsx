import React from 'react';
import { Composition } from 'remotion';
import TL from './timeline.json';
import { Proof } from './Proof';
import { Secure } from './Secure';
import { Price } from './Price';
import { Paid } from './Paid';
import { Receipts } from './Receipts';
import { Switch } from './Switch';
import { Accountant } from './Accountant';
import { Pitch } from './Pitch';
import { Leads } from './Leads';

const common = { width: 1080, height: 1920, fps: 30 } as const;
export const Root: React.FC = () => (<>
  <Composition id="proof" component={Proof} durationInFrames={TL.proof.frames} {...common} />
  <Composition id="secure" component={Secure} durationInFrames={TL.secure.frames} {...common} />
  <Composition id="price" component={Price} durationInFrames={TL.price.frames} {...common} />
  <Composition id="paid" component={Paid} durationInFrames={TL.paid.frames} {...common} />
  <Composition id="receipts" component={Receipts} durationInFrames={TL.receipts.frames} {...common} />
  <Composition id="switch" component={Switch} durationInFrames={TL.switch.frames} {...common} />
  <Composition id="accountant" component={Accountant} durationInFrames={TL.accountant.frames} {...common} />
  <Composition id="pitch" component={Pitch} durationInFrames={TL.pitch.frames} width={1920} height={1080} fps={30} />
  <Composition id="leads" component={Leads} durationInFrames={TL.leads.frames} {...common} />
</>);

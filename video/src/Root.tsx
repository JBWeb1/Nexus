import React from 'react';
import { Composition } from 'remotion';
import TL from './timeline.json';
import { Proof } from './Proof';
import { Secure } from './Secure';
import { Price } from './Price';
import { Paid } from './Paid';
import { Receipts } from './Receipts';

const common = { width: 1080, height: 1920, fps: 30 } as const;
export const Root: React.FC = () => (<>
  <Composition id="proof" component={Proof} durationInFrames={TL.proof.frames} {...common} />
  <Composition id="secure" component={Secure} durationInFrames={TL.secure.frames} {...common} />
  <Composition id="price" component={Price} durationInFrames={TL.price.frames} {...common} />
  <Composition id="paid" component={Paid} durationInFrames={TL.paid.frames} {...common} />
  <Composition id="receipts" component={Receipts} durationInFrames={TL.receipts.frames} {...common} />
</>);

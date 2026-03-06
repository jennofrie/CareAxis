'use client';

import dynamic from 'next/dynamic';

const QuantumSign = dynamic(() => import('@/views/QuantumSign'), { ssr: false });

export default function QuantumSignPage() {
  return <QuantumSign />;
}

import { NextResponse } from 'next/server'
import { allRuns, listExperiments, reconcile } from '@/lib/db'
import { providerStatuses, unsupportedModalities } from '@/lib/providers'

export const dynamic = 'force-dynamic'

let reconciled = false

export function GET() {
  if (!reconciled) {
    reconcile()
    reconciled = true
  }
  return NextResponse.json({
    experiments: listExperiments(),
    runs: allRuns(),
    providers: providerStatuses(),
    unsupported: unsupportedModalities(),
  })
}

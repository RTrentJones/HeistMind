import { Header } from "@/components/layout/Header"
import { ShadowsGate } from "@/components/landing/ShadowsGate"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <Header />
      <ShadowsGate />
    </main>
  )
}

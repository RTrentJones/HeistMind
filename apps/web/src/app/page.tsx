'use client';

import { Container, Card, CardHeader, CardTitle, CardContent } from '@heist-mind/ui';
import { AuthHeader } from '@/features/auth/components/AuthHeader';

export default function HomePage() {
  return (
    <div className='min-h-screen bg-neutral-950'>
      <AuthHeader />

      <main className='py-12'>
        <Container>
          <div className='text-center space-y-8'>
            {/* Hero Section */}
            <div className='space-y-4'>
              <h1 className='text-4xl md:text-6xl font-bold text-white'>
                Welcome to <span className='text-orange-400'>Heist</span>Mind
              </h1>
              <p className='text-xl text-neutral-300 max-w-2xl mx-auto'>
                The ultimate character management platform for Forged in the Dark tabletop RPGs.
                Create, manage, and advance your scoundrels across multiple campaigns.
              </p>
            </div>

            {/* Features Grid */}
            <div className='grid md:grid-cols-3 gap-6 mt-12'>
              <Card>
                <CardHeader>
                  <CardTitle>Dynamic Character Creation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-neutral-400'>
                    Build characters using any Forged in the Dark ruleset. Upload custom rules or
                    use community-created content.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multi-Game Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-neutral-400'>
                    Organize characters across multiple games and campaigns. Track advancement,
                    stress, and relationships.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seamless Collaboration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-neutral-400'>
                    Share characters with GMs, clone builds for new games, and collaborate on crew
                    sheets and faction relationships.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Call to Action */}
            <div className='mt-16 space-y-4'>
              <h2 className='text-2xl font-semibold text-white'>Ready to start your next heist?</h2>
              <p className='text-neutral-400'>
                Sign up with Discord to begin managing your scoundrels and join the community.
              </p>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}

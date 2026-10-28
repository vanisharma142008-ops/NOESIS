import React from 'react';
import { OrangeLightBeam } from './OrangeLightBeam';
import { HeroDashboard } from './HeroDashboard';
import { BRAND } from '../../config/brand';
import type { AuthMode } from './AuthDialog';
import type { CloudUser } from '@/src/cloud/sync';

interface HeroProps {
  onStartLearning?: () => void;
  onExploreExperience?: () => void;
  user?: CloudUser | null;
  onOpenAuth?: (mode: AuthMode) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onStartLearning,
  onExploreExperience,
  user,
  onOpenAuth,
}) => {
  const handlePrimaryClick = () => {
    if (onStartLearning) {
      onStartLearning();
    } else {
      const el = document.getElementById('experience');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSecondaryClick = () => {
    if (onExploreExperience) {
      onExploreExperience();
    } else {
      const el = document.getElementById('features');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section" id="hero" aria-label="Introduction">
      {/* Signature Orange Light Beam Background */}
      <OrangeLightBeam />

      <div className="hero-content-wrapper">
        {/* Editorial Typography & CTA Header */}
        <div className="hero-header-block">
          {/* Eyebrow */}
          <div className="hero-eyebrow-pill">
            <span className="eyebrow-beacon" aria-hidden="true" />
            <span className="eyebrow-text">{BRAND.eyebrow}</span>
          </div>

          {/* Headline */}
          <h1 className="hero-main-headline">
            <span className="headline-line">{BRAND.heroHeadlineLine1}</span>
            <span className="headline-line headline-gradient">
              {BRAND.heroHeadlineLine2}
            </span>
          </h1>

          {/* Supporting Copy */}
          <p className="hero-description">{BRAND.heroDescription}</p>

          {/* Two distinct CTAs */}
          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={handlePrimaryClick}
            >
              <span>{BRAND.ctaPrimary}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              className="btn-hero-secondary"
              onClick={handleSecondaryClick}
            >
              <span>{BRAND.ctaSecondary}</span>
            </button>
          </div>

          {/* Sign in / Sign up */}
          {onOpenAuth && (
            <div className="hero-auth-group">
              {user ? (
                <span className="hero-auth-user" data-testid="hero-user">Signed in as {user.label}</span>
              ) : (
                <>
                  <button type="button" className="btn-hero-auth btn-hero-auth--primary" onClick={() => onOpenAuth('signup')} data-testid="hero-signup">Sign up</button>
                  <button type="button" className="btn-hero-auth" onClick={() => onOpenAuth('signin')} data-testid="hero-signin">Sign in</button>
                </>
              )}
            </div>
          )}

          {/* Microcopy */}
          <div className="hero-microcopy">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FE9400"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{BRAND.microcopy}</span>
          </div>
        </div>

        {/* Realistic Hero Dashboard Preview */}
        <div className="hero-dashboard-anchor" id="experience">
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
};

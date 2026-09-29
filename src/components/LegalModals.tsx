import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
    <div className="w-full sm:max-w-lg max-h-[85vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <h3 className="font-['Syne'] font-bold text-sm sm:text-base text-white">{title}</h3>
        <button
          onClick={() => {
            haptic.selection();
            onClose();
          }}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Body */}
      <div className="p-4 overflow-y-auto no-scrollbar text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </div>
  </div>
);

export const ContentPolicyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalWrapper title="Authorized Content & Anti-Piracy Policy" onClose={onClose}>
    <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-200 flex items-start gap-2.5">
      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-bold block mb-0.5">Strict Legal Authorization Commitment</span>
        Stark Anime operates exclusively under lawful license and distribution agreements. We strictly prohibit unauthorized reproduction, piracy, torrenting, scraping, or copyright infringement.
      </div>
    </div>

    <h4 className="font-bold text-white text-xs mt-2">1. Distribution Rights Verification</h4>
    <p>
      Every anime series, movie, season, and individual episode uploaded to the Stark Anime platform requires explicit administrator verification of distribution ownership or legal licensing rights prior to publication.
    </p>

    <h4 className="font-bold text-white text-xs">2. No-Download Architecture</h4>
    <p>
      In accordance with content licensing protocols, Stark Anime provides temporary, expiring signed streaming tokens exclusively. The application intentionally provides zero download buttons, APIs, or permanent public video links.
    </p>

    <h4 className="font-bold text-white text-xs">3. Content Classification & NSFW Ban</h4>
    <p>
      Stark Anime enforces strict family and adolescent safety standards. Explicit adult, sexual (18+ NSFW), or non-consensual content is categorically prohibited and prevented from being ingested or published.
    </p>

    <h4 className="font-bold text-white text-xs">4. Takedown Compliance</h4>
    <p>
      In the event of a rights dispute or copyright inquiry, claims submitted via our DMCA portal are reviewed immediately by compliance officers with immediate takedown capabilities.
    </p>
  </ModalWrapper>
);

export const PrivacyPolicyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalWrapper title="Privacy Policy" onClose={onClose}>
    <p>
      Stark Anime is designed as a privacy-respecting Telegram Mini App. This policy outlines how your data is handled.
    </p>
    <h4 className="font-bold text-white text-xs mt-2">1. Telegram Information Collected</h4>
    <p>
      We receive basic identity parameters (Telegram User ID, First Name, Username, and Avatar URL) transmitted securely through Telegram WebApp cryptographic initData. We never access your Telegram chats, contacts, or phone numbers.
    </p>
    <h4 className="font-bold text-white text-xs">2. Playback History & Library Storage</h4>
    <p>
      Your watch positions, completed episodes, and saved titles are stored to enable cross-device progress synchronization. This data is linked solely to your pseudonymous Telegram user ID.
    </p>
    <h4 className="font-bold text-white text-xs">3. Right to Deletion</h4>
    <p>
      You have the permanent right under GDPR and privacy regulations to wipe all stored records at any moment by clicking "Delete My Data" in your Profile tab.
    </p>
  </ModalWrapper>
);

export const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalWrapper title="Terms of Service" onClose={onClose}>
    <p>
      By accessing Stark Anime via Telegram, you agree to these Terms of Service.
    </p>
    <h4 className="font-bold text-white text-xs mt-2">1. Permitted Use</h4>
    <p>
      Stark Anime is provided for personal, non-commercial streaming within the official Telegram client. Reverse-engineering streams or attempting to circumvent token authentication is strictly prohibited.
    </p>
    <h4 className="font-bold text-white text-xs">2. Service Availability</h4>
    <p>
      We strive for 99.9% uptime, but content availability is subject to licensing terms, geographic constraints, and scheduled maintenance windows.
    </p>
  </ModalWrapper>
);

export const CopyrightClaimModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [claimantName, setClaimantName] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [contentType, setContentType] = useState<'anime' | 'movie'>('anime');
  const [contentId, setContentId] = useState('');
  const [allegedWorkDescription, setAllegedWorkDescription] = useState('');
  const [infringementDetails, setInfringementDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimantName || !claimantEmail || !contentId || !infringementDetails) {
      setErrorMessage('Please fill in all required declaration fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await api.submitCopyrightClaim({
        claimantName,
        claimantEmail,
        organization,
        contentType,
        contentId,
        allegedWorkDescription,
        infringementDetails
      });
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit copyright claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper title="Copyright / DMCA Takedown Notice" onClose={onClose}>
      {successMessage ? (
        <div className="py-6 flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <h4 className="text-sm font-bold text-white">Notice Successfully Registered</h4>
          <p className="text-xs text-slate-400 max-w-xs">{successMessage}</p>
          <button
            onClick={onClose}
            className="mt-2 px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-slate-400 text-[11px]">
            Rights owners or authorized agents may submit takedown notices. Legitimate claims will be acted upon immediately.
          </p>

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Your Full Legal Name *</label>
            <input
              type="text"
              required
              value={claimantName}
              onChange={(e) => setClaimantName(e.target.value)}
              className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Kenji Sato"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Official Email Address *</label>
            <input
              type="email"
              required
              value={claimantEmail}
              onChange={(e) => setClaimantEmail(e.target.value)}
              className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="legal@rights-holder.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Organization / Studio</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Studio Sunrise / Toei"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full h-9 px-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="anime">Anime Series</option>
                <option value="movie">Movie</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Content Identifier *</label>
              <input
                type="text"
                required
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. anime-01"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Copyrighted Work Description</label>
            <textarea
              rows={2}
              value={allegedWorkDescription}
              onChange={(e) => setAllegedWorkDescription(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="Identification of the copyrighted anime or film owned."
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Infringement Details *</label>
            <textarea
              rows={3}
              required
              value={infringementDetails}
              onChange={(e) => setInfringementDetails(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="Explain the nature of the claim and confirmation of authorized legal agency."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Transmitting Notice...' : 'Submit Takedown Claim'}</span>
          </button>
        </form>
      )}
    </ModalWrapper>
  );
};

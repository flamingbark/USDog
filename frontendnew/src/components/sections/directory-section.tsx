"use client";

import React, { useEffect, useState } from "react";

type Person = {
  department: string;
  role: string;
  assignee: string;
  twitter: string;
  wallet: string;
  description: string;
};

// Data (ported as provided)
const people: Person[] = [
  {
    department: "Executive Leadership (DIC)",
    role: "Honorary Founder & Chief Advisor",
    assignee: "Billy Markus",
    twitter: "https://x.com/BillyM2k",
    wallet: "0x2218e854019D3Ac7989333470E8CF7BDA8b930F3",
    description:
      "The co-creator of Dogecoin, bringing unmatched credibility to the stablecoin project. With a deep understanding of Dogecoin’s codebase and community ethos, he provides strategic guidance on technical integration, ensuring seamless compatibility with the stablecoin’s infrastructure. His authentic voice and massive following amplify marketing efforts, fostering trust among memecoin enthusiasts. Markus aligns the project with Dogecoin’s decentralized, inclusive values, bridging communities to drive adoption and cultural resonance.",
  },
  {
    department: "Executive Leadership (DIC)",
    role: "Head of Operations & Business Development",
    assignee: "Smoke_theArtist",
    twitter: "https://x.com/Smoke_theArtist",
    wallet: "0x0A0ed6600A19D3b349311e513fB9D84e288FF33C",
    description:
      "A seasoned DAO leader and early NFT adopter, excels in operations and partnership-building, having secured high-profile collaborations with Wintermute and Magic Eden for Own The Doge DAO. With a track record of scaling businesses to $10M in revenue, Smoke oversees day-to-day operations, liquidity integrations, and sponsorships. Their cross-chain expertise and community engagement skills ensure the stablecoin achieves robust adoption and seamless user experiences across diverse platforms.",
  },
  {
    department: "Executive Leadership (DIC)",
    role: "Head of Community & Global Outreach",
    assignee: "Saladpingers",
    twitter: "https://x.com/saladpingers",
    wallet: "0x6C41932a0afD71b30F3119B8f129617BC34161aF",
    description:
      "A passionate Doge ecosystem contributor, has led impactful projects like the Doge Pilgrimage and Bronze Doge Statue. They leverage a global network and creative storytelling to coordinate IRL events, charity drives, and transparent grant programs. Their operational rigor and cultural alignment with memecoin communities foster trust and engagement, ensuring the stablecoin resonates worldwide while maintaining ethical, community-first outreach.",
  },
  {
    department: "Technical & Tokenomics",
    role: "Lead Tokenomics Designer",
    assignee: "0xluden",
    twitter: "https://x.com/0xluden",
    wallet: "0xf63488819D82e794c52cc792D9c9fe1a84AEFeec",
    description:
      "With a decade in gaming and token economy design, architects sustainable mechanics for the stablecoin, including community-driven mini-games to boost engagement. Based in Asia, she spearheads market expansion in Japan and Korea, leveraging her DAO experience from Own The Doge and MonkeDAO. Her expertise in tokenomics and governance ensures fair, scalable reward systems, aligning incentives to drive adoption and long-term stability.",
  },
  {
    department: "Technical & Tokenomics",
    role: "Technical Advisor & Provenance Specialist",
    assignee: "Thalex",
    twitter: "https://x.com/_Thalex_",
    wallet: "0x547411802E5d39275aEcaCaa17d27F0a9D3f2692",
    description:
      "A crypto veteran since 2016, specializes in provenance and decentralized governance, with experience in Elonrwa DAO and commercial tech contracts. They ensure secure smart contract design and align incentives with memecoin cultural roots. Expertise in risk management and cross-disciplinary negotiation strengthens the stablecoin’s technical foundation, ensuring transparency and trust in its decentralized operations.",
  },
  {
    department: "Technical & Tokenomics",
    role: "Governance & Airdrop Specialist",
    assignee: "Tridog",
    twitter: "https://x.com/tridog",
    wallet: "0xE768687Cf9Ff40a1319F4847d3afD5b9fb6a4700",
    description:
      "A memecoin governance expert, designs equitable voting systems and airdrop mechanics to engage dog communities. With hands-on experience in cross-chain integrations and no-code wallet solutions, they ensure seamless onboarding and privacy-first approaches. Their community mobilization skills, honed through meme contests and AMAs, drive sustained participation and align the stablecoin with decentralized ethos.",
  },
  {
    department: "Marketing & Branding",
    role: "Chief Marketing Officer (CMO)",
    assignee: "Lucie",
    twitter: "https://x.com/LucieSHIB",
    wallet: "0xEf0CA0aFe00df4c9021656825958DEf42b721AaF",
    description:
      "A core Shiba Inu ecosystem leader, brings proven marketing expertise from launching Shibarium and managing multi-token ecosystems (SHIB, BONE, LEASH). Crafts strategic campaigns, navigates community sentiment through volatility, and secures partnerships with major platforms.Crisis communication skills and regulatory awareness ensure the stablecoin’s messaging resonates globally while maintaining trust and adoption.",
  },
  {
    department: "Marketing & Branding",
    role: "Head of Creative Content & Memes",
    assignee: "HorBull™",
    twitter: "https://x.com/HorBull",
    wallet: "0x8e373f0426A6102A550016125156B4526A4ABDF6",
    description:
      "A memecoin analyst with a knack for viral content, creates meme-driven campaigns that capture the playful spirit of Dogecoin and Shiba Inu. Their technical analysis and market sentiment expertise inform branding strategies, ensuring community resonance. Amplifies the stablecoin’s visibility through shareable visuals and storytelling, driving organic adoption.",
  },
  {
    department: "Marketing & Branding",
    role: "Creative Ambassador & Community Educator",
    assignee: "Meta_Rach",
    twitter: "https://x.com/meta_rach",
    wallet: "0x792d2B50BFfF0B004EE631e6fFE2d9928f8eF34F",
    description:
      "An OG Dogecoin advocate with a BFA in Art History, blends creativity and analytics to educate communities on stablecoin mechanics. Revitalizes platforms like Pixel Portal and hosts experiential events to foster engagement. Focus on fun, authentic storytelling strengthens community loyalty, making the stablecoin accessible and appealing to both degen and mainstream audiences.",
  },
  {
    department: "Community Management",
    role: "Lead Community Moderator",
    assignee: "SpecialK",
    twitter: "https://x.com/SpecialShib",
    wallet: "0x2B06649686f516Ba7CE9C29513DF01C4af6C8919",
    description:
      "An experienced Shibarium moderator, excels in managing high-traffic discussions and facilitating DAO proposals like LEASH v2. Their transparent communication and crisis management skills build trust and retention in volatile memecoin communities. As Lead Community Moderator, ensures real-time engagement, resolves conflicts, and drives governance participation for the stablecoin.",
  },
  {
    department: "Partnerships & Growth",
    role: "Meme Marketing & Partnership Liaison",
    assignee: "Cryptopathic",
    twitter: "https://x.com/Cryptopathic",
    wallet: "0x1d4B9b250B1Bd41DAA35d94BF9204Ec1b0494eE3",
    description:
      "A crypto trader since 2013, leverages deep ties in Dogecoin and Shiba Inu communities to drive meme marketing and partnerships. Their expertise in on-chain analytics and NFT art fuels viral campaigns and DEX integrations. Cryptopathic’s authentic engagement ensures the stablecoin resonates with memecoin culture, fostering trust and expanding adoption through strategic collaborations.",
  },
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function DirectorySection() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openModal = (p: Person) => {
    setSelected(p);
    setOpen(true);
  };
  const closeModal = () => setOpen(false);

  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Copy failed. Select and copy manually.");
    }
  };

  const count = people.length;

  return (
    <section className="orgdir-wrapper" aria-label="Project Directory">

      <main className="container">
        <section className="grid" aria-live="polite">
          {people.map((p) => {
            const id = slug(p.assignee + "-" + p.role);
            return (
              <article
                key={id}
                className="card"
                role="button"
                tabIndex={0}
                aria-label={`${p.assignee} - ${p.role}`}
                onClick={() => openModal(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal(p);
                  }
                }}
              >
                <div className="dept">{p.department}</div>
                <h3 className="role">{p.role}</h3>
                <p className="assignee">@{p.assignee}</p>
                <div className="row">
                  <span className="chip">Twitter</span>{" "}
                  <a
                    className="link"
                    href={p.twitter}
                    target="_blank"
                    rel="noopener"
                  >
                    Open
                  </a>
                </div>
                <div className="row">
                  <span className="chip">Wallet</span>{" "}
                  <span className="pill">{p.wallet}</span>
                </div>
                <div className="row">
                  <button className="btn" type="button">
                    Open Details
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <div
        className={`modal ${open ? "show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="dialog">
          <header>
            <h2 id="dlg-title">
              {selected ? `${selected.assignee} — ${selected.role}` : "Title"}
            </h2>
            <div className="meta">{selected?.department ?? ""}</div>
          </header>
          <div className="content">
            <div className="row">
              <span className="chip">Twitter</span>
              {selected && (
                <a
                  id="dlg-twitter"
                  className="link"
                  href={selected.twitter}
                  target="_blank"
                  rel="noopener"
                >
                  {selected.twitter.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
            <div className="row">
              <span className="chip">Wallet</span>
              <span id="dlg-wallet" className="pill">
                {selected?.wallet ?? ""}
              </span>
              <button
                id="copy-btn"
                className="btn"
                type="button"
                onClick={copy}
              >
                Copy
              </button>
              <span
                id="copy-status"
                className="chip"
                style={{ display: copied ? "inline-block" : "none" }}
              >
                Copied
              </span>
            </div>
            <p id="dlg-desc" className="desc">
              {selected?.description ?? ""}
            </p>
          </div>
          <div className="actions">
            <button id="close-btn" className="btn" type="button" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .orgdir-wrapper {
          --card: #ffffff;
          --text: #1f2937;
          --muted: #475569;
          --brand: #8c65f7;
          --border: #e5e7eb;
          --chip: #eef2ff;
          position: relative;
          margin-top: 3rem;
          color: var(--text);
          background: transparent;
        }
        .container {
          max-width: 1100px;
          margin: 0 auto;
        }
        .grid {
          display: grid;
          gap: 14px;
          padding: 16px 20px 40px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .card {
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
        }
        .card:focus,
        .card:hover {
          transform: translateY(-2px);
          border-color: rgba(140, 101, 247, 0.4);
          outline: none;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
        }
        .dept {
          font-size: 11px;
          color: var(--brand);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 6px;
        }
        .role {
          font-weight: 700;
          font-size: 16px;
          margin: 0 0 6px;
          color: #111827;
        }
        .assignee {
          margin: 0 0 10px;
          color: var(--muted);
          font-size: 14px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 6px 0;
          font-size: 13px;
          flex-wrap: wrap;
        }
        .chip {
          background: var(--chip);
          color: #4f46e5;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 12px;
        }
        .pill {
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px dashed var(--border);
          color: var(--muted);
          font-size: 12px;
          word-break: break-all;
          background: #f9fafb;
        }
        .btn {
          appearance: none;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 10px;
          background: #ffffff;
          color: #111827;
          cursor: pointer;
          font-size: 12px;
        }
        .btn:hover {
          border-color: rgba(140, 101, 247, 0.5);
          color: #4f46e5;
        }
        .link {
          color: #3b82f6;
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        /* Modal */
        .modal {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          display: none;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 50;
        }
        .modal.show {
          display: flex;
        }
        .dialog {
          width: min(800px, 96vw);
          background-color: #ffffff;
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        .dialog header {
          padding: 16px 18px;
          background: linear-gradient(180deg, #ffffff, #f9fafb);
          border-bottom: 1px solid var(--border);
        }
        .dialog .content {
          padding: 18px;
        }
        .dialog h2 {
          margin: 0 0 4px;
          font-size: 20px;
          color: #111827;
        }
        .dialog .meta {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .desc {
          line-height: 1.6;
          color: #334155;
          font-size: 15px;
          white-space: pre-wrap;
        }
        .dialog .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 14px 18px;
          background: #f9fafb;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </section>
  );
}
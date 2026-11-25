#!/usr/bin/env python3
"""Builds the static SEO pages, sitemap.xml, robots.txt and llms.txt.

The home page is a JavaScript bundle on one URL, so search engines see a
single page. These are plain HTML pages, one per search worth winning, plus
one per case study. Edit the content below, then run:

    python3 scripts/build_pages.py

and commit the generated files. No dependencies.

Set SITE_EMAIL to show a contact email on the pages (the enquiry form works
without it):

    SITE_EMAIL=you@example.com python3 scripts/build_pages.py
"""
import json
import os
import re
from datetime import date
from html import escape, unescape

ORIGIN = "https://besiserver.co.uk"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = date.today().isoformat()
EMAIL = os.environ.get("SITE_EMAIL", "").strip()
GTM_ID = "GTM-T3QVFWTX"  # same container the middleware adds to the home page

# --------------------------------------------------------------------- shared

BUSINESS = {
    "@type": "ProfessionalService",
    "@id": f"{ORIGIN}/#business",
    "name": "Bes",
    "alternateName": "Bes — automation for small businesses",
    "url": f"{ORIGIN}/",
    "image": f"{ORIGIN}/assets/og.jpg",
    "description": "Automation for UK small businesses: AI customer-email inboxes, order and booking "
                   "pipelines, follow-ups, reporting dashboards and websites wired into them.",
    "founder": {"@type": "Person", "@id": f"{ORIGIN}/#besfort", "name": "Besfort Hyseni",
                "jobTitle": "Automation developer", "url": f"{ORIGIN}/"},
    "areaServed": [{"@type": "Country", "name": "United Kingdom"}, {"@type": "City", "name": "Leeds"}],
    "knowsAbout": ["Business process automation", "AI automation", "n8n", "Workflow automation",
                   "AI agents", "Email automation", "Web development"],
}
if EMAIL:
    BUSINESS["email"] = EMAIL

SERVICES = [
    ("Orders &amp; bookings", "Website orders, DMs and phone bookings land in one queue and get confirmed "
     "automatically. Nothing lost on a busy night."),
    ("Customer follow-ups", "Enquiries answered in minutes, reminders sent, reviews requested and regulars "
     "invited back — without you typing a thing."),
    ("Reports &amp; dashboards", "Sales, stock and bookings in one live view, instead of rebuilding "
     "spreadsheets at the end of every week."),
    ("Email &amp; customer support", "Customer emails read, sorted and answered for you — with anything "
     "important, like a refund, sent to your phone for a yes or no."),
    ("Admin &amp; data entry", "Invoices, sheets and CRMs kept in sync automatically. No more copying the "
     "same details into three places."),
    ("Websites that do the work", "A site wired into your systems, so orders, bookings and enquiries flow "
     "straight to where they're handled."),
]

STEPS = [
    ("A free 15-minute call", "Tell me what eats your week. No jargon, no obligation."),
    ("A clear plan", "What I'd automate, what it saves you, and the price — agreed before any work starts."),
    ("Built around you", "Set up on the tools you already use and tested on your real orders, emails and data."),
    ("Running and supported", "I keep an eye on it and adjust it as your business grows."),
]

CASES = [
    {
        "slug": "birria-birria", "title": "Birria Birria", "category": "Hospitality · ordering &amp; ops",
        "place": "Leeds", "image": "birriabirria.jpg", "w": 1800, "h": 963,
        "alt": "Birria Birria's online ordering page",
        "meta_title": "Birria Birria: Restaurant Ordering Automation in Leeds | Bes",
        "short": "Website orders, Instagram DMs and walk-ups funnelled into one live prep queue.",
        "summary": "An order-to-kitchen system for a birria restaurant in Leeds that turns scattered DMs and "
                   "online orders into a single live prep queue.",
        "role": "Design, front end, automation", "stack": "Ordering site, n8n, webhook and messaging APIs, Google Sheets",
        "live": "https://www.birriabirria.co.uk/",
        "problem": "Orders arrived from three directions at once — the website, Instagram DMs and the counter — "
                   "and were reconciled by hand on a busy service. Tickets went missing, prep order was "
                   "guesswork, and the end-of-day totals were rebuilt from memory and a calculator.",
        "steps": [
            "A responsive ordering front end takes online orders and normalises every incoming ticket into "
            "the same shape, whatever channel it arrived from.",
            "An n8n pipeline listens on webhooks, merges the channels, and sorts the queue by prep time "
            "rather than arrival order.",
            "The kitchen reads one live prep list; customers receive automatic status messages; sales and "
            "stock roll into a sheet at close with no manual entry.",
        ],
        "impact": "Order handling per ticket fell sharply, and the lost-DM problem on busy nights disappeared.",
    },
    {
        "slug": "abode-email-support", "title": "Abode Email Support", "category": "Customer service · email",
        "place": "Leeds", "image": "abode.jpg", "w": 1800, "h": 932,
        "alt": "The n8n workflow behind Abode's AI support inbox",
        "meta_title": "Abode: AI Customer Email Support Automation | Bes",
        "short": "An AI inbox that sorts, answers and refunds customer emails — with a yes/no from the owner on Telegram.",
        "summary": "An AI support inbox for Abode in Leeds: every customer email is read, sorted and answered "
                   "automatically, and refunds wait for a yes on Telegram before they go out.",
        "role": "Automation design, build", "stack": "n8n, Gmail, OpenAI agents, payments API, Telegram",
        "live": None,
        "problem": "Every customer email landed in one inbox and was answered by hand — general questions, "
                   "account and payment queries, and refund requests all in the same queue. Busy days meant "
                   "slow replies, and every refund meant checking the payment by hand first.",
        "steps": [
            "A Gmail trigger picks up each new email with its full thread, and an AI classifier sorts it: "
            "general support, an account or payment question, or a refund.",
            "Each type goes to its own AI agent. General questions are answered straight away; account "
            "questions look up the customer and their payments before replying.",
            "Refund requests go to the owner on Telegram first. Approved refunds are processed and confirmed "
            "by email; declined ones get a polite reply. Every reply is sent from Gmail, marked read and "
            "logged to Telegram.",
        ],
        "impact": "The inbox now runs itself: routine emails are answered without anyone opening Gmail, and "
                  "the owner only steps in to approve a refund from their phone.",
    },
    {
        "slug": "blood-testing-panel", "title": "Blood Testing Panel", "category": "Health · data &amp; reporting",
        "place": None, "image": "blood-panel.jpg", "w": 2000, "h": 1250,
        "alt": "Blood test dashboard showing biomarkers against reference ranges (demo data)",
        "meta_title": "Blood Testing Panel: Health Data Dashboard | Bes",
        "short": "Raw lab exports turned into a colour-coded, trend-aware health panel.",
        "summary": "A blood-panel dashboard that ingests lab results and turns rows of numbers into a "
                   "readable, colour-coded health story.",
        "role": "Design, front end, data layer", "stack": "Parsing layer, interactive charting, reference-range engine, PDF reports",
        "live": None,
        "problem": "Lab results arrive as dense PDFs. Reading them meant scanning a table of markers against "
                   "reference ranges by eye, highlighting anything unusual, and having no view at all of how a "
                   "value had moved since the last test.",
        "steps": [
            "A parsing layer reads raw panel exports and maps every marker onto its healthy reference range.",
            "Each marker is plotted, flagged green, amber or red, and tracked across previous tests so the "
            "direction of travel is visible.",
            "A report generator produces a shareable PDF of the same view for a clinician or for personal records.",
        ],
        "impact": "A manual, error-prone reading exercise became a single upload that anyone can understand at a glance.",
    },
    {
        "slug": "trading-tool", "title": "Trading Tool", "category": "Fintech · data &amp; signals",
        "place": None, "image": "trading.jpg", "w": 2000, "h": 1250,
        "alt": "ICTEdge Pro trading dashboard with live signals",
        "meta_title": "Trading Tool: Market Signals &amp; Alerts Dashboard | Bes",
        "short": "Live market data, configurable rules, and one screen of clean signals.",
        "summary": "A trading tool that pulls live market data, runs a configurable rule set, and surfaces "
                   "clean signals on a single screen.",
        "role": "Design, front end, alerting layer", "stack": "Market-data APIs, real-time charting, alerting layer, configurable rules",
        "live": None,
        "problem": "Watching for setups meant keeping ten browser tabs open and reading charts manually. "
                   "Decisions were made on a fragmented view, and anything that happened away from the "
                   "screen was simply missed.",
        "steps": [
            "Live market data is ingested continuously from provider APIs into one normalised feed.",
            "A configurable set of indicators and rules is evaluated against the feed in real time.",
            "Matches surface as alerts and a focused watchlist, so the screen shows conclusions rather than raw charts.",
        ],
        "impact": "Scattered manual chart-watching consolidated into one automated, alert-driven cockpit.",
    },
]
CASE = {c["slug"]: c for c in CASES}

LANDINGS = [
    {
        "path": "/ai-automation-agency/", "nav": "AI automation",
        "title": "AI Automation Agency for UK Small Businesses | Bes",
        "description": "AI automations that answer customer emails, sort enquiries and handle admin for UK small "
                       "businesses — built on your own tools, with you in control.",
        "service": "AI automation", "eyebrow": "AI automation · UK small businesses",
        "h1": "An AI automation agency for <em>small businesses.</em>",
        "lede": "I build AI automations that do the repetitive work in your business — reading and answering "
                "customer emails, sorting enquiries, chasing follow-ups, pulling numbers into reports — and hand "
                "anything that matters back to you for a yes or no.",
        "sections": [
            ("What AI automation actually does for a small business",
             "<p>Not a chatbot bolted onto your website. AI automation connects the tools you already use — your "
             "inbox, your forms, your spreadsheets, your payments — and lets AI do the reading, sorting and "
             "writing in between.</p>",
             [("Answers customer emails", "Every new email is read, sorted by what the customer needs, and "
               "answered using your own policies and their account details."),
              ("Sorts enquiries and leads", "Website forms, DMs and emails are read, classified and routed, so the "
               "ones that matter reach you first."),
              ("Keeps you in control", "Anything involving money or judgement — a refund, a quote, an exception — "
               "is sent to your phone for a yes or no before it happens."),
              ("Writes the boring bits", "Follow-ups, reminders and summaries drafted in your tone and sent at the "
               "right time.")]),
        ],
        "feature": "abode-email-support",
        "feature_title": "Real example: an inbox that answers itself",
        "why": ("Why a small, hands-on agency",
                "<p>You deal with the person who builds it. No account managers and no handovers — I design the "
                "automation, build it and look after it.</p><p>Everything is built around tools you already use "
                "— Gmail, Google Sheets, your website, Telegram — in n8n, so your workflows stay visible and "
                "you're not locked into a platform you can't see inside.</p>"),
        "faq": [
            ("How much does AI automation cost?", "It depends on what's involved, so every project gets a fixed "
             "price after a free 15-minute call. You agree the price before any work starts."),
            ("Will AI reply to my customers without me checking?", "Only where you're comfortable with it. Routine "
             "questions can be answered automatically; anything involving money or a judgement call — like a "
             "refund — can wait for your approval on your phone first."),
            ("What tools does it work with?", "Most things with an inbox or an API: Gmail and Outlook, Google Sheets, "
             "website forms, payment providers, Telegram and more. I build in n8n, which connects to hundreds of apps."),
            ("What can the automation see and do?", "Only what you connect it to. Before anything is built we go "
             "through what data is involved, so you know exactly what each automation can see and do."),
            ("Do you only work with businesses in Leeds?", "No — I work with businesses across the UK, remotely. "
             "Some of my clients are in Leeds."),
        ],
        "related": ["/business-automation/", "/n8n-automation/", "/work/"],
    },
    {
        "path": "/business-automation/", "nav": "Business automation",
        "title": "Business Automation Consultant for Small Businesses | Bes",
        "description": "Automate orders, bookings, follow-ups, reports and admin. A UK automation consultant who "
                       "builds it and looks after it, with the price agreed upfront.",
        "service": "Business process automation", "eyebrow": "Business automation · consultant",
        "h1": "Business automation for <em>small businesses.</em>",
        "lede": "Most of what slows a small business down is repetitive: copying orders into a spreadsheet, chasing "
                "replies, rebuilding the same report every week. I find that work and replace it with systems that "
                "run themselves.",
        "sections": [
            ("Signs your business is ready for automation",
             "<ul class=\"ticks\"><li>You copy the same details into more than one place.</li>"
             "<li>Orders or enquiries arrive in several places — website, DMs, email, phone.</li>"
             "<li>Customers wait for replies on busy days.</li>"
             "<li>End-of-week reports take hours to put together.</li>"
             "<li>You can't take on more work without hiring.</li></ul>", None),
        ],
        "services": True,
        "feature": "birria-birria",
        "feature_title": "Real example: one queue instead of three",
        "why": ("A consultant who builds it",
                "<p>A business automation consultant looks at how work moves through your business today, finds "
                "the repetitive steps and replaces them with automations. I do the building myself, rather than "
                "handing you a report — and I keep the automations running afterwards.</p>"),
        "faq": [
            ("What does a business automation consultant do?", "Maps how work moves through your business, finds "
             "the repetitive steps, and replaces them with automations that run on their own — then keeps them running."),
            ("How long does it take?", "It depends on the size of the job. You'll get a clear plan with timings "
             "before any work starts."),
            ("How much does it cost?", "Every project gets a fixed price after a free 15-minute call, agreed before "
             "any work starts."),
            ("What if my process changes later?", "Automations are adjusted as your business grows — that's part "
             "of the support after launch."),
            ("Do I need to be technical?", "No. You explain what happens today; I handle the rest and show you how it works."),
        ],
        "related": ["/ai-automation-agency/", "/n8n-automation/", "/leeds/"],
    },
    {
        "path": "/n8n-automation/", "nav": "n8n",
        "title": "n8n Automation Agency &amp; Developer (UK) | Bes",
        "description": "n8n workflows designed, built and looked after for UK businesses — AI agents, Gmail, Sheets, "
                       "webhooks and payment APIs. See a real n8n build.",
        "service": "n8n workflow automation", "eyebrow": "n8n automation · UK",
        "h1": "n8n automation, <em>built and looked after.</em>",
        "lede": "n8n is a workflow automation tool that connects your apps and runs the steps between them — "
                "including AI agents. I design, build and maintain n8n workflows for businesses that want the "
                "result without having to learn the tool.",
        "sections": [
            ("Why n8n",
             "<p>Most automation tools are fine for two-step jobs. n8n is built for the real ones — with logic, "
             "AI and a human in the loop.</p>",
             [("Connects almost anything", "Hundreds of built-in integrations, plus anything with an API or a webhook."),
              ("AI agents built in", "Agent nodes that read, classify and reply, with tools to look things up "
               "before they answer."),
              ("Can be self-hosted", "Your workflows and data can stay on infrastructure you control."),
              ("Visible, not a black box", "Every workflow is a diagram you can open and follow step by step.")]),
            ("What I build with n8n",
             "<ul class=\"ticks\"><li>AI support inboxes: Gmail trigger → AI classifier → agents that reply → "
             "Telegram approvals.</li><li>Order pipelines: webhooks from your site and DMs → one queue → Google Sheets.</li>"
             "<li>Lead and enquiry routing, with instant alerts to your phone.</li>"
             "<li>Scheduled reports and dashboards fed from your own tools.</li>"
             "<li>Fixes and extensions to n8n workflows you already have.</li></ul>", None),
        ],
        "feature": "abode-email-support",
        "feature_title": "A real n8n workflow",
        "why": ("Hosting and support",
                "<p>Workflows can run on your own n8n account, on n8n Cloud, or be set up and hosted for you — "
                "we'll pick what suits you on the first call. After launch I keep an eye on them and update them "
                "when your tools or process change.</p>"),
        "faq": [
            ("What is n8n?", "A workflow automation tool. You connect apps — like Gmail, Google Sheets or your "
             "payment provider — and n8n runs the steps between them on a trigger or a schedule, including AI steps."),
            ("Should I use n8n or Zapier?", "Zapier is quick for simple, two-step jobs. n8n suits longer workflows "
             "with logic, AI agents and approvals, and it can be self-hosted. I'll recommend whichever fits your job."),
            ("Can you fix or extend an existing n8n workflow?", "Yes — send me what you have and what you'd like it to do."),
            ("Do I need my own n8n account?", "Not necessarily. It can run on your account or be set up and hosted "
             "for you."),
            ("How much does an n8n build cost?", "Every project gets a fixed price after a free 15-minute call, "
             "agreed before any work starts."),
        ],
        "related": ["/ai-automation-agency/", "/business-automation/", "/work/abode-email-support/"],
    },
    {
        "path": "/leeds/", "nav": "Leeds",
        "title": "Automation &amp; Web Development in Leeds | Bes",
        "description": "Automation and web development for Leeds businesses — ordering systems, AI email inboxes "
                       "and dashboards, for clients like Birria Birria and Abode.",
        "service": "Automation and web development", "eyebrow": "Leeds · automation &amp; web",
        "h1": "Automation and web development for <em>Leeds businesses.</em>",
        "lede": "From a Leeds restaurant's online ordering to an AI inbox that answers a Leeds company's customer "
                "emails, I build the systems that take admin off small businesses — and the websites in front of them.",
        "sections": [],
        "leeds_cases": True,
        "services": True,
        "why": ("Websites that do the work",
                "<p>If you need a website, it's built by hand, fast on phones, and wired into your systems — so "
                "orders, bookings and enquiries go straight to where they're handled, not just into an inbox.</p>"),
        "faq": [
            ("Do you work with businesses outside Leeds?", "Yes — across the UK, remotely."),
            ("Can you build my website too?", "Yes. Websites are built by hand, quick on phones, and connected to "
             "your automations, so the site does real work."),
            ("How much does it cost?", "Every project gets a fixed price after a free 15-minute call, agreed before "
             "any work starts."),
            ("What kinds of Leeds businesses do you work with?", "So far a restaurant and a company handling its "
             "customer support by email — the work suits any small business with repetitive admin."),
        ],
        "related": ["/business-automation/", "/ai-automation-agency/", "/work/"],
    },
]

PAGES_NAV = [("/work/", "Work"), ("/ai-automation-agency/", "AI automation"), ("/n8n-automation/", "n8n"),
             ("/leeds/", "Leeds")]

# ------------------------------------------------------------------- template

CSS = """
@font-face{font-family:Archivo;src:url(/assets/fonts/Archivo.woff2) format('woff2');font-weight:100 900;font-display:swap}
@font-face{font-family:Serif;src:url(/assets/fonts/InstrumentSerif-Regular.woff2) format('woff2');font-display:swap}
@font-face{font-family:Serif;font-style:italic;src:url(/assets/fonts/InstrumentSerif-Italic.woff2) format('woff2');font-display:swap}
@font-face{font-family:Mono;src:url(/assets/fonts/JetBrainsMono.woff2) format('woff2');font-weight:100 900;font-display:swap}
:root{--paper:#f4f2ea;--ink:#16170f;--rust:#7a3b1f;--mute:rgba(22,23,15,.6);--line:rgba(22,23,15,.16);--card:#ece9de}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.65 Archivo,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.eyebrow,.crumbs,.nav,.label{font-family:Mono,ui-monospace,monospace}
header{position:sticky;top:0;z-index:10;background:rgba(244,242,234,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;justify-content:space-between;min-height:62px;padding-top:8px;padding-bottom:8px}
.brand{font-family:Serif,Georgia,serif;font-size:26px;text-decoration:none;letter-spacing:-.01em}
.brand span{font-family:Mono,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);margin-left:10px}
.nav{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase}
.nav a{text-decoration:none;color:var(--mute)}
.nav a:hover,.nav a[aria-current]{color:var(--ink)}
.nav .book{color:var(--rust)}
.crumbs{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin:40px 0 0}
.crumbs a{text-decoration:none}
.eyebrow{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--rust);margin:28px 0 0}
h1,h2,h3{font-family:Serif,Georgia,serif;font-weight:400;letter-spacing:-.015em;margin:0}
h1{font-size:clamp(42px,7.4vw,88px);line-height:.98;margin-top:18px;max-width:16ch}
h1 em,h2 em{color:var(--rust)}
h2{font-size:clamp(32px,4.6vw,50px);line-height:1.05}
h3{font-size:27px;line-height:1.12}
.lede{font-size:clamp(18px,2.2vw,21px);line-height:1.6;color:rgba(22,23,15,.76);max-width:60ch;margin:26px 0 0}
.ctas{display:flex;flex-wrap:wrap;gap:12px 28px;margin-top:30px}
.cta{font-family:Mono,monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:var(--rust);border-bottom:1px solid var(--rust);padding-bottom:6px}
.cta.alt{color:var(--mute);border-color:var(--line)}
section{padding:72px 0 0}
.label{display:flex;justify-content:space-between;gap:12px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);padding-bottom:14px;border-bottom:1px solid var(--ink);margin-bottom:8px}
.prose{max-width:66ch;color:rgba(22,23,15,.78)}
.prose p{margin:18px 0 0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:0 36px}
.card{padding:26px 0 28px;border-bottom:1px solid var(--line)}
.card .n{font-family:Mono,monospace;font-size:11px;color:var(--rust)}
.card h3{margin-top:12px}
.card p{margin:10px 0 0;font-size:15.5px;color:rgba(22,23,15,.68)}
.ticks{list-style:none;padding:0;margin:18px 0 0;max-width:66ch}
.ticks li{padding:12px 0 12px 30px;border-bottom:1px solid var(--line);position:relative;color:rgba(22,23,15,.8)}
.ticks li::before{content:"";position:absolute;left:4px;top:21px;width:12px;height:7px;border:solid var(--rust);border-width:0 0 2px 2px;transform:rotate(-45deg)}
.feature{display:grid;grid-template-columns:1.15fr .85fr;gap:36px;align-items:center;margin-top:26px}
.shot{border:1px solid var(--line);background:var(--card);padding:10px}
.cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:28px;margin-top:26px}
.case{text-decoration:none;display:block}
.case .shot{aspect-ratio:16/10;overflow:hidden;padding:0}
.case .shot img{width:100%;height:100%;object-fit:cover;object-position:top center}
.case h3{margin-top:16px}
.case p{margin:6px 0 0;font-size:15.5px;color:rgba(22,23,15,.66)}
.case .label{border:0;padding:0;margin:10px 0 0;color:var(--rust)}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:18px 32px;padding:22px 0;margin-top:40px;border-top:1px solid var(--ink);border-bottom:1px solid var(--line);font-family:Mono,monospace;font-size:13px}
.meta b{display:block;font-weight:400;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);margin-bottom:6px}
.figure{margin:36px 0 0}
.figure figcaption{font-family:Mono,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin-top:12px}
.steps{counter-reset:s;list-style:none;padding:0;margin:18px 0 0;max-width:66ch}
.steps li{counter-increment:s;display:grid;grid-template-columns:46px 1fr;gap:12px;padding:18px 0;border-bottom:1px solid var(--line);color:rgba(22,23,15,.8)}
.steps li::before{content:counter(s,decimal-leading-zero);font-family:Mono,monospace;font-size:12px;color:var(--rust);padding-top:4px}
.impact{font-family:Serif,Georgia,serif;font-size:clamp(26px,3.4vw,36px);line-height:1.22;max-width:30ch;margin-top:20px}
details{border-bottom:1px solid var(--line);padding:18px 0;max-width:72ch}
summary{cursor:pointer;font-family:Serif,Georgia,serif;font-size:24px;line-height:1.25;list-style:none}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;font-family:Mono,monospace;color:var(--rust)}
details[open] summary::after{content:"–"}
details p{margin:12px 0 0;color:rgba(22,23,15,.76)}
.book-wrap{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;margin-top:26px}
form{background:var(--ink);color:var(--paper);padding:28px 28px 24px}
form .t{font-family:Serif,Georgia,serif;font-size:30px;line-height:1.1}
form .s{font-family:Mono,monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#d9c3b4;margin-top:8px}
form label{display:block;margin-top:18px;font-family:Mono,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,242,234,.62)}
form input,form textarea{display:block;width:100%;margin-top:8px;padding:12px 14px;background:rgba(244,242,234,.06);border:1px solid rgba(244,242,234,.24);border-radius:0;color:var(--paper);font:16px Archivo,system-ui,sans-serif}
form textarea{resize:vertical}
form button{margin-top:22px;width:100%;display:flex;justify-content:space-between;padding:16px 18px;background:var(--paper);color:var(--ink);border:0;font-family:Mono,monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
form .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
[data-enquiry-status]{margin:14px 0 0;min-height:1.5em;font-size:14px}
.related{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:22px}
footer{margin-top:90px;border-top:1px solid var(--line);padding:26px 0 48px;font-family:Mono,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
footer .wrap{display:flex;flex-wrap:wrap;gap:14px 28px;justify-content:space-between}
footer nav{display:flex;flex-wrap:wrap;gap:10px 22px}
footer a{text-decoration:none}
@media (max-width:760px){.feature,.book-wrap{grid-template-columns:1fr}.brand span{display:none}section{padding-top:56px}}
"""

GOOGLE_TAG = (
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
    "gtag('js',new Date());(function(){try{var o=new URLSearchParams(location.search).get(\"optout\");"
    "if(o===\"1\"||(o!==\"0\"&&localStorage.getItem(\"bes.optout\")===\"1\"))return;}catch(e){}"
    "var s=document.createElement(\"script\");s.async=true;"
    f"s.src=\"https://www.googletagmanager.com/gtm.js?id={GTM_ID}\";document.head.appendChild(s);}})();</script>"
)


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def text(html):
    """Plain text for meta tags and JSON-LD."""
    return unescape(re.sub(r"<[^>]+>", "", html))


def breadcrumbs(trail):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": text(n), "item": f"{ORIGIN}{p}"}
        for i, (p, n) in enumerate(trail)]}


def mail_link():
    return f'<a href="mailto:{EMAIL}">{EMAIL}</a>' if EMAIL else ""


def page(path, title, description, body, graph, current=None, image="/assets/og.jpg"):
    url = f"{ORIGIN}{path}"
    nav = "".join(
        f'<a href="{p}"' + (' aria-current="page"' if p == current else "") + f">{n}</a>" for p, n in PAGES_NAV)
    footer_links = "".join(f'<a href="{p}">{n}</a>' for p, n in
                           [("/", "Home"), ("/work/", "Case studies"), ("/ai-automation-agency/", "AI automation"),
                            ("/business-automation/", "Business automation"), ("/n8n-automation/", "n8n"),
                            ("/leeds/", "Leeds")]) + mail_link()
    t, d = text(title), text(description)
    return f"""<!doctype html>
<html lang="en-GB">
<head>
{GOOGLE_TAG}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(t)}</title>
<meta name="description" content="{escape(d)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{escape(t)}">
<meta property="og:description" content="{escape(d)}">
<meta property="og:image" content="{ORIGIN}{image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/assets/fonts/InstrumentSerif-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Archivo.woff2" as="font" type="font/woff2" crossorigin>
<style>{CSS}</style>
{ld({"@context": "https://schema.org", "@graph": [BUSINESS] + graph})}
<script defer src="/assets/js/track.js"></script>
<script defer src="/assets/js/enquiry.js"></script>
</head>
<body>
<header><div class="wrap">
<a class="brand" href="/">Bes<span>automation for small businesses</span></a>
<nav class="nav">{nav}<a class="book" href="#book">Book a call</a></nav>
</div></header>
<main class="wrap">
{body}
</main>
<footer><div class="wrap">
<span>Built by hand · © {date.today().year} Besfort Hyseni</span>
<nav>{footer_links}</nav>
</div></footer>
</body>
</html>
"""


def crumbs(trail):
    parts = [f'<a href="{p}">{n}</a>' for p, n in trail[:-1]] + [trail[-1][1]]
    return f'<p class="crumbs">{" / ".join(parts)}</p>'


def cards(items):
    return '<div class="cards">' + "".join(
        f'<div class="card"><div class="n">{i:02d}</div><h3>{h}</h3><p>{p}</p></div>'
        for i, (h, p) in enumerate(items, 1)) + "</div>"


def case_cards(slugs):
    out = []
    for s in slugs:
        c = CASE[s]
        out.append(
            f'<a class="case" href="/work/{s}/"><div class="shot"><img src="/assets/screenshots/{c["image"]}" '
            f'alt="{escape(c["alt"])}" width="{c["w"]}" height="{c["h"]}" loading="lazy"></div>'
            f'<h3>{c["title"]}</h3><p>{c["short"]}</p><div class="label">{c["category"]} →</div></a>')
    return '<div class="cases">' + "".join(out) + "</div>"


def steps_block():
    return ('<section><div class="label"><span>How it works</span><span>04 steps</span></div>'
            + cards(STEPS) + "</section>")


def book_block(heading="Book a free 15-minute call"):
    email = f"<p>Prefer email? {mail_link()}</p>" if EMAIL else ""
    return f"""<section id="book">
<div class="label"><span>Get in touch</span><span>Reply within two working days</span></div>
<div class="book-wrap">
<div class="prose"><h2>Tell me which part is <em>eating your time.</em></h2>
<p>Orders, bookings, follow-ups, spreadsheets — whatever you're doing by hand every week, tell me about it. I'll reply within two working days to set up a free 15-minute call.</p>
{email}</div>
<form data-enquiry>
<div class="t">{heading}</div>
<div class="s">Tell me a little and I'll reply with times</div>
<label>Your name<input name="name" type="text" autocomplete="name"></label>
<label>Business<input name="business" type="text" autocomplete="organization"></label>
<label>Email or phone *<input name="contact" type="text" required autocomplete="email"></label>
<label>What's taking up your time? *<textarea name="message" rows="4" required></textarea></label>
<input class="hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
<button type="submit">Send <span>→</span></button>
<p data-enquiry-status></p>
</form>
</div>
</section>"""


def faq_block(faq):
    return ('<section><div class="label"><span>Questions</span><span>' + f"{len(faq):02d}" + "</span></div>"
            + "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq) + "</section>")


def faq_ld(faq):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
        for q, a in faq]}


NAMES = {l["path"]: l["nav"] for l in LANDINGS}
NAMES.update({"/work/": "Case studies"})
NAMES.update({f"/work/{c['slug']}/": c["title"] for c in CASES})


def landing(l):
    trail = [("/", "Home"), (l["path"], l["nav"])]
    body = [crumbs(trail), f'<p class="eyebrow">{l["eyebrow"]}</p>', f'<h1>{l["h1"]}</h1>',
            f'<p class="lede">{l["lede"]}</p>',
            '<div class="ctas"><a class="cta" href="#book">Book a free 15-min call →</a>'
            '<a class="cta alt" href="/work/">See what I\'ve automated →</a></div>']
    for h, html, items in l["sections"]:
        body.append(f'<section><h2>{h}</h2><div class="prose">{html}</div>{cards(items) if items else ""}</section>')
    if l.get("services"):
        body.append('<section><div class="label"><span>What I automate</span><span>06 areas</span></div>'
                    + cards(SERVICES) + "</section>")
    if l.get("leeds_cases"):
        body.append('<section><div class="label"><span>Built for Leeds businesses</span><span>02</span></div>'
                    + case_cards(["birria-birria", "abode-email-support"]) + "</section>")
    if l.get("feature"):
        c = CASE[l["feature"]]
        body.append(
            f'<section><div class="label"><span>{l["feature_title"]}</span><span>Case study</span></div>'
            f'<div class="feature"><div class="shot"><img src="/assets/screenshots/{c["image"]}" alt="{escape(c["alt"])}" '
            f'width="{c["w"]}" height="{c["h"]}" loading="lazy"></div><div class="prose"><h3>{c["title"]}</h3>'
            f'<p>{c["summary"]}</p><p>{c["impact"]}</p><p><a class="cta" href="/work/{c["slug"]}/">Read the case study →</a></p>'
            f"</div></div></section>")
    body.append(steps_block())
    h, html = l["why"]
    body.append(f'<section><h2>{h}</h2><div class="prose">{html}</div></section>')
    if not l.get("leeds_cases"):
        body.append('<section><div class="label"><span>Proof — running for clients</span><span>04 systems</span></div>'
                    + case_cards([c["slug"] for c in CASES]) + "</section>")
    body.append(faq_block(l["faq"]))
    body.append('<section><div class="label"><span>Related</span><span></span></div><div class="related">'
                + "".join(f'<a class="cta alt" href="{p}">{NAMES[p]} →</a>' for p in l["related"]) + "</div></section>")
    body.append(book_block())
    graph = [
        {"@type": "Service", "@id": f"{ORIGIN}{l['path']}#service", "name": text(l["h1"]),
         "serviceType": l["service"], "description": text(l["description"]), "provider": {"@id": f"{ORIGIN}/#business"},
         "areaServed": BUSINESS["areaServed"], "url": f"{ORIGIN}{l['path']}"},
        faq_ld(l["faq"]), breadcrumbs(trail)]
    return page(l["path"], l["title"], l["description"], "\n".join(body), graph, current=l["path"])


def case_page(c, nxt):
    path = f"/work/{c['slug']}/"
    trail = [("/", "Home"), ("/work/", "Case studies"), (path, c["title"])]
    live = (f'<div><b>Live</b><a href="{c["live"]}" rel="noopener">{c["live"].split("//")[1].strip("/")} ↗</a></div>'
            if c["live"] else "<div><b>Live</b>Private</div>")
    steps = "".join(f"<li><span>{s}</span></li>" for s in c["steps"])
    body = f"""{crumbs(trail)}
<p class="eyebrow">Case study · {c["category"]}{" · " + c["place"] if c["place"] else ""}</p>
<h1>{c["title"]}</h1>
<p class="lede">{c["summary"]}</p>
<div class="meta"><div><b>Role</b>{c["role"]}</div><div><b>Stack</b>{c["stack"]}</div><div><b>Status</b>Running</div>{live}</div>
<figure class="figure"><div class="shot"><img src="/assets/screenshots/{c["image"]}" alt="{escape(c["alt"])}" width="{c["w"]}" height="{c["h"]}"></div>
<figcaption>{escape(c["alt"])}</figcaption></figure>
<section><div class="label"><span>01 — The problem</span><span></span></div><div class="prose"><p>{c["problem"]}</p></div></section>
<section><div class="label"><span>02 — The system</span><span></span></div><ol class="steps">{steps}</ol></section>
<section><div class="label"><span>03 — The impact</span><span></span></div><p class="impact">{c["impact"]}</p></section>
<section><div class="label"><span>Next case study</span><span></span></div>
<p><a class="cta" href="/work/{nxt["slug"]}/">{nxt["title"]} →</a></p>
<div class="related"><a class="cta alt" href="/business-automation/">Business automation →</a><a class="cta alt" href="/ai-automation-agency/">AI automation →</a><a class="cta alt" href="/n8n-automation/">n8n automation →</a></div></section>
{book_block("Want something like this?")}"""
    graph = [
        {"@type": "Article", "@id": f"{ORIGIN}{path}#article", "headline": text(f'{c["title"]}: {c["short"]}'),
         "description": text(c["summary"]), "image": f'{ORIGIN}/assets/screenshots/{c["image"]}',
         "datePublished": "2026-11-25", "dateModified": TODAY,
         "author": {"@id": f"{ORIGIN}/#besfort"}, "publisher": {"@id": f"{ORIGIN}/#business"},
         "mainEntityOfPage": f"{ORIGIN}{path}"},
        breadcrumbs(trail)]
    return page(path, c["meta_title"], c["summary"], body, graph, current="/work/",
                image=f'/assets/screenshots/{c["image"]}')


def work_index():
    trail = [("/", "Home"), ("/work/", "Case studies")]
    body = (crumbs(trail) + '<p class="eyebrow">Case studies</p><h1>Four builds, all <em>running for clients.</em></h1>'
            '<p class="lede">A restaurant ordering queue, an AI customer-support inbox, a blood-test dashboard and a '
            'trading signals tool — each one replacing a manual job with a system that runs itself.</p>'
            '<section>' + case_cards([c["slug"] for c in CASES]) + "</section>" + steps_block() + book_block())
    graph = [{"@type": "CollectionPage", "@id": f"{ORIGIN}/work/#page", "name": "Automation case studies",
              "hasPart": [{"@id": f"{ORIGIN}/work/{c['slug']}/#article"} for c in CASES]}, breadcrumbs(trail)]
    return page("/work/", "Automation Case Studies | Bes",
                "Four automation systems running for clients: a restaurant ordering queue, an AI customer-support "
                "inbox, a blood-test dashboard and a trading signals tool.", body, graph, current="/work/")


def write(path, content):
    out = os.path.join(ROOT, path.strip("/"), "index.html") if path.endswith("/") else os.path.join(ROOT, path.strip("/"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(content)
    print("wrote", os.path.relpath(out, ROOT))


def main():
    urls = ["/"]
    for l in LANDINGS:
        write(l["path"], landing(l))
        urls.append(l["path"])
    write("/work/", work_index())
    urls.append("/work/")
    for i, c in enumerate(CASES):
        write(f"/work/{c['slug']}/", case_page(c, CASES[(i + 1) % len(CASES)]))
        urls.append(f"/work/{c['slug']}/")

    write("/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + "".join(f"  <url><loc>{ORIGIN}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in urls)
          + "</urlset>\n")
    write("/robots.txt", "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\n"
          f"Sitemap: {ORIGIN}/sitemap.xml\n")
    contact = f"- Enquiries: the form on any page{', or ' + EMAIL if EMAIL else ''}"
    lines = [
        "# Bes — automation for small businesses",
        "",
        "> Besfort Hyseni (Bes) builds automations for UK small businesses: AI customer-email inboxes, order and "
        "booking pipelines, follow-ups, reporting dashboards and the websites wired into them, mostly in n8n. "
        "Every project starts with a free 15-minute call and a price agreed before work starts.",
        "",
        "## Services",
    ] + [f"- [{text(l['title']).split(' | ')[0]}]({ORIGIN}{l['path']}): {text(l['description'])}" for l in LANDINGS] + [
        "",
        "## Case studies",
    ] + [f"- [{text(c['title'])}]({ORIGIN}/work/{c['slug']}/): {text(c['summary'])}" for c in CASES] + [
        "",
        "## Contact",
        contact,
        f"- Home: {ORIGIN}/",
        "",
    ]
    write("/llms.txt", "\n".join(lines))


if __name__ == "__main__":
    main()

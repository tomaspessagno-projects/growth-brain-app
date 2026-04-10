const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "Growth Brain: The AI-Powered Growth Operating System",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "1. Executive Summary",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun("Growth Brain is a professional, high-performance web application designed for growth teams and marketing managers to centralize, track, and optimize their experimentation funnel. Built with Next.js, Supabase, and Gemini AI, it provides a seamless workflow from initial hypothesis to executive reporting."),
                ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "2. Core Vision & Value Proposition",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: "• Centralize Knowledge: All experiments, metrics, and learnings in one place.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Velocity Focus: Designed to increase experimental tempo by streamlining the Plan-Execute-Learn cycle.", bullet: { level: 0 } }),
            new Paragraph({ text: "• AI-Driven Insights: Leverages Google Gemini AI to analyze complex data.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Executive Transparency: Automated reporting bridging the gap to business KPIs.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({
                text: "3. Key Pillars & Features",
                heading: HeadingLevel.HEADING_1,
            }),
            
            new Paragraph({ text: "A. The Unified Growth Dashboard", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "A holistic command center providing an immediate pulse on the organization's growth. Incluyes activity snapshots, visual growth funnel, and quick actions." }),

            new Paragraph({ text: "B. The 7-Step Conversion Funnel", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "1. Visitas: Top-of-funnel traffic." }),
            new Paragraph({ text: "2. Datos Personales: Lead generation." }),
            new Paragraph({ text: "3. Cotizaron: Pricing interactions." }),
            new Paragraph({ text: "4. Intención Alta: Behavioral triggers." }),
            new Paragraph({ text: "5. Inicio Alta: Onboarding start." }),
            new Paragraph({ text: "6. Ingreso Portal: User activation." }),
            new Paragraph({ text: "7. Cliente: Final conversion." }),

            new Paragraph({ text: "C. Experiment Management System (XPMS)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "Structured approach to plan, track, and archive growth hacks with full lifecycle management (Planned, In Progress, Finished)." }),

            new Paragraph({ text: "D. Advanced Metrics & Snapshots", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "Record metric values over time. Automatically calculates percentage changes (Δ%) and renders interactive charts." }),

            new Paragraph({ text: "E. AI-Powered Analysis", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "Integrated with Gemini AI for smart hypotheses, automated insights, and learning suggestions based on raw data." }),

            new Paragraph({ text: "F. Executive Weekly Reporting", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "One-click professional PDF generation with AI-generated executive summaries and KPI scorecards." }),

            new Paragraph({ text: "" }),
            new Paragraph({
                text: "4. Technical Architecture",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: "• Frontend: Next.js with App Router.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Backend: Supabase with Auth & Row Level Security.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Intelligence Layer: Google Gemini AI.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Export: jsPDF for professional document generation.", bullet: { level: 0 } }),

            new Paragraph({ text: "" }),
            new Paragraph({
                text: "5. Ideal For",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: "Growth Managers, Marketing Teams, and Executives looking for data-driven precision." }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("GrowthBrain_Summary.docx", buffer);
    console.log("Document created successfully: GrowthBrain_Summary.docx");
});

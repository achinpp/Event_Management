import { NextResponse } from 'next/server';
import { executePenpotCode, exportPenpotShape } from '@/lib/penpot';

export const maxDuration = 60;

/**
 * Color palettes keyed by detected "vibe" keywords in the user prompt.
 * Falls back to a clean default if no keywords match.
 */
const PALETTES: Record<string, { bg: string; text: string; accent: string }> = {
  cyber:     { bg: '#0D0221', text: '#E0E0FF', accent: '#00F0FF' },
  tech:      { bg: '#0F172A', text: '#F1F5F9', accent: '#38BDF8' },
  party:     { bg: '#4A0072', text: '#FFFFFF', accent: '#FF6EC7' },
  wedding:   { bg: '#FFF8F0', text: '#3D2B1F', accent: '#C49A6C' },
  corporate: { bg: '#1E293B', text: '#F8FAFC', accent: '#6366F1' },
  music:     { bg: '#1A0A2E', text: '#FFFFFF', accent: '#F97316' },
  sports:    { bg: '#14532D', text: '#FFFFFF', accent: '#22C55E' },
  food:      { bg: '#431407', text: '#FEF3C7', accent: '#F59E0B' },
  art:       { bg: '#FFFBEB', text: '#1C1917', accent: '#E11D48' },
  charity:   { bg: '#1E3A5F', text: '#FFFFFF', accent: '#34D399' },
  default:   { bg: '#111827', text: '#F9FAFB', accent: '#818CF8' },
};

function detectPalette(text: string) {
  const lower = text.toLowerCase();
  for (const [key, palette] of Object.entries(PALETTES)) {
    if (key !== 'default' && lower.includes(key)) return palette;
  }
  // Additional keyword aliases
  if (lower.match(/hack|code|dev|startup/)) return PALETTES.tech;
  if (lower.match(/concert|dj|festival|band/)) return PALETTES.music;
  if (lower.match(/gala|formal|business|conference/)) return PALETTES.corporate;
  if (lower.match(/fun|celebration|birthday/)) return PALETTES.party;
  if (lower.match(/run|marathon|game|match/)) return PALETTES.sports;
  if (lower.match(/cook|dinner|brunch|tasting/)) return PALETTES.food;
  if (lower.match(/exhibit|gallery|paint|creative/)) return PALETTES.art;
  if (lower.match(/fundrais|donate|volunteer|ngo/)) return PALETTES.charity;
  return PALETTES.default;
}

/**
 * Extracts a structured design spec from the raw user prompt
 * without calling any LLM — pure string parsing.
 */
function parsePrompt(prompt: string) {
  const palette = detectPalette(prompt);

  // Try to extract a title (first sentence or first ~5 words)
  const sentences = prompt.split(/[.!?\n]/).filter(Boolean);
  const rawTitle = sentences[0]?.trim() || prompt.trim();
  const titleWords = rawTitle.split(/\s+/).slice(0, 5).join(' ');
  const title = titleWords.length > 40 ? titleWords.substring(0, 37) + '...' : titleWords;

  // Try to pull out date/time/location patterns
  const dateMatch = prompt.match(
    /(?:on\s+)?((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{0,2},?\s*\d{0,4}|\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4}|tonight|tomorrow|this\s+(?:friday|saturday|weekend))/i
  );
  const timeMatch = prompt.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/);
  const locationMatch = prompt.match(
    /(?:in|at|@)\s+([A-Z][a-zA-Z\s]{2,25}(?:,\s*[A-Z]{2})?)/
  );

  const subtitleParts: string[] = [];
  if (dateMatch) subtitleParts.push(dateMatch[1].trim());
  if (timeMatch) subtitleParts.push(timeMatch[1].trim());
  if (locationMatch) subtitleParts.push(locationMatch[1].trim());
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'Coming Soon';

  // Use the remainder or the full prompt as description
  const description =
    sentences.length > 1
      ? sentences.slice(1).join('. ').trim().substring(0, 100)
      : prompt.trim().substring(0, 100);

  return {
    title,
    subtitle,
    description,
    backgroundColor: palette.bg,
    textColor: palette.text,
    accentColor: palette.accent,
  };
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Step 1: Parse the prompt locally (no LLM needed)
    const designSpec = parsePrompt(prompt);
    console.log('Parsed design spec:', designSpec);

    // Step 2: Build the Penpot script
    const penpotScript = `
      try {
        const board = penpot.createBoard();
        board.name = "Event Banner";
        
        // Setup layout
        board.addFlexLayout();
        if (board.flex) {
            board.flex.dir = "column";
            board.flex.alignItems = "center";
            board.flex.justifyContent = "center";
            board.flex.rowGap = 24;
            board.flex.horizontalPadding = 48;
            board.flex.verticalPadding = 64;
        }
        
        // Sizing
        board.resize(800, 400);
        board.horizontalSizing = "fix";
        board.verticalSizing = "fix";
        
        // Styling
        board.fills = [{ fillColor: "${designSpec.backgroundColor}", fillOpacity: 1 }];
        board.borderRadius = 16;
        
        // Title
        const titleText = penpot.createText(${JSON.stringify(designSpec.title)});
        titleText.fills = [{ fillColor: "${designSpec.textColor}", fillOpacity: 1 }];
        titleText.fontSize = 48;
        titleText.fontWeight = "700";
        board.appendChild(titleText);
        
        // Subtitle
        const subtitleText = penpot.createText(${JSON.stringify(designSpec.subtitle)});
        subtitleText.fills = [{ fillColor: "${designSpec.accentColor}", fillOpacity: 1 }];
        subtitleText.fontSize = 24;
        subtitleText.fontWeight = "700";
        board.appendChild(subtitleText);
        
        // Description
        const descText = penpot.createText(${JSON.stringify(designSpec.description)});
        descText.fills = [{ fillColor: "${designSpec.textColor}", fillOpacity: 0.8 }];
        descText.fontSize = 18;
        descText.fontWeight = "400";
        board.appendChild(descText);

        // Add to canvas
        penpot.root.appendChild(board);
        
        // Wait 100ms for layout to compute
        await new Promise(r => setTimeout(r, 100));
        
        return board.id;
      } catch (e) {
        return "ERROR: " + e.message;
      }
    `;

    // Step 3: Execute the script via Penpot MCP
    console.log('Executing Penpot code...');
    const resultId = await executePenpotCode(penpotScript);
    
    if (!resultId || resultId.startsWith('ERROR')) {
      throw new Error('Failed to generate shape in Penpot: ' + resultId);
    }

    console.log('Successfully created shape:', resultId);

    // Step 4: Try to export the generated shape as SVG
    // If export times out, we still return success — the shape exists on the canvas
    let svgData: string | null = null;
    let exportError: string | null = null;
    
    try {
      console.log('Exporting shape as SVG...');
      svgData = await exportPenpotShape(resultId, 'svg');
    } catch (err: any) {
      console.warn('Export failed (shape still exists on canvas):', err.message);
      exportError = err.message;
    }

    const penpotUrl = process.env.PENPOT_UI_URL || 'http://194.233.95.35:9001';

    return NextResponse.json({
      svg: svgData,
      spec: designSpec,
      shapeId: resultId,
      exportError,
      penpotUrl,
      message: svgData
        ? 'Design generated and exported successfully!'
        : 'Design created on Penpot canvas! Export timed out — open Penpot to see it.',
    });

  } catch (error: any) {
    console.error('Design generation error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during design generation' },
      { status: 500 }
    );
  }
}

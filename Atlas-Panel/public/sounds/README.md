# Sound Effects for Atlas Panel

Add the following sound files here:

## Required Sound Files

### 1. **cash-register.mp3** - Classic "cha-ching" cash register sound
   - **Recommended**: Short, crisp, satisfying
   - **Duration**: 1-2 seconds
   - **Use for**: Regular sales completion
   - **Volume**: Will play at 30% by default

### 2. **coin-drop.mp3** - Single coin drop sound
   - **Recommended**: Metallic, quick
   - **Duration**: 0.5-1 second
   - **Use for**: Small transactions, subtle feedback
   - **Volume**: Will play at 20% by default

### 3. **jackpot.mp3** - Slot machine jackpot sound
   - **Recommended**: Exciting but not overwhelming
   - **Duration**: 2-3 seconds
   - **Use for**: Big sales (>R$1000), major milestones
   - **Volume**: Will play at 50% by default

### 4. **achievement.mp3** - Achievement unlocked sound
   - **Recommended**: Uplifting, triumphant
   - **Duration**: 2-3 seconds
   - **Use for**: Milestones (100 sales, R$10k revenue, etc.)
   - **Volume**: Will play at 40% by default

### 5. **combo.mp3** - Combo/streak sound
   - **Recommended**: Building excitement, energetic
   - **Duration**: 1-2 seconds
   - **Use for**: Sale streaks (3+ sales within 5 minutes)
   - **Volume**: Will play at 30% by default

## Free Sound Resources

### High Quality Free Sources:
- **[Freesound.org](https://freesound.org)** - Community-driven, requires free account
  - Search: "cash register", "coin", "achievement", "success"

- **[Zapsplat.com](https://www.zapsplat.com)** - Professional quality, free with account
  - Category: Games > Arcade > Coins/Points

- **[Mixkit.co](https://mixkit.co/free-sound-effects/)** - No account required
  - Category: Game Sounds

### Quick Download Links (Recommended):
1. **Cash Register**: Search "cash register cha ching" on any platform
2. **Coin Drop**: Search "coin collect" or "coin pickup"
3. **Jackpot**: Search "slot machine win" or "casino jackpot"
4. **Achievement**: Search "achievement unlocked" or "level up"
5. **Combo**: Search "combo sound" or "streak bonus"

## File Format Requirements
- **Format**: MP3 (preferred) or OGG
- **Bitrate**: 128kbps or higher
- **Sample Rate**: 44.1kHz
- **Channels**: Mono or Stereo
- **Max Size**: 500KB per file (keep them small for fast loading)

## Implementation Details

The sounds are preloaded and managed by `/app/lib/celebrations.ts` with the following features:
- Automatic preloading on page load
- Volume control (user adjustable)
- Enable/disable toggle (persisted in localStorage)
- Graceful fallback if sounds are missing
- Respects browser autoplay policies

## Testing the Sounds

Once you've added the sound files, you can test them:

1. Open the Transactions page
2. Click the "🎉 Test Celebration" button (in development mode)
3. Or trigger a real transaction to hear the sounds

## Volume Guidelines

Default volumes are set to be pleasant and not jarring:
- Background sounds: 20-30%
- Action sounds: 30-40%
- Big celebration sounds: 40-50%

Users can adjust the global volume or disable sounds entirely through the sound toggle button in the UI.

## License Considerations

Make sure to use royalty-free sounds or sounds with appropriate licenses for commercial use. Most sites above offer sounds under Creative Commons or similar licenses that allow commercial use.

## Troubleshooting

If sounds don't play:
1. Check browser console for errors
2. Ensure files are in the correct format (MP3)
3. Verify file names match exactly (case-sensitive)
4. Test with different browsers (Chrome/Firefox/Safari)
5. Check browser autoplay policies (user interaction may be required)
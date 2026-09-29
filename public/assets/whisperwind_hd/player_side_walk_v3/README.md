# Main player side walk v3

Selected main-player side cycles only. Use metadata.json four-frame order for left and right. The first two selections use bounded crops of initial rows. Frame 3 and frame 4 of those rows are rejected and must not be used. Contact B and passing B use separate complete originals.

Contact and supporting-leg parity pass local visual QA: near forward / near support / near trailing / far support. Both directions remain fixed. All soles are registered to y=0 using a torso-centered x anchor. Scale is uniform in x/y and matched to head landmarks. No source image was warped or edited.

The generated B sources vary slightly in proportions and arm details; total selected solid heights are about77-82 world units. Local QA supports this as a four-pose improvement, with runtime approval still needed. Do not treat it as a perfectly stabilized production animation or extend it to other outfits/NPCs.

review.html provides sourceRect playback with a fixed sole line and step controls. prompts.json, contact_b_prompts.json and passing_b_prompts.json preserve exact generation prompts.

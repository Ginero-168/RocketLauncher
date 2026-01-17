console.log("TATA Pro Loading...");
console.log("Version: 2.1 - Effects Tab Update");
console.log("Quick Clean buttons should be visible at bottom of Scripts tab");
console.log("setupEffects() registered:", typeof setupEffects !== 'undefined');

// Add this at the very end of main.js init
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM Loaded - Checking buttons:");
    console.log("- btn_clean_stray:", document.getElementById('btn_clean_stray') ? 'FOUND' : 'NOT FOUND');
    console.log("- btn_clean_empty:", document.getElementById('btn_clean_empty') ? 'FOUND' : 'NOT FOUND');
    console.log("- btn_outline_text:", document.getElementById('btn_outline_text') ? 'FOUND' : 'NOT FOUND');
    console.log("- btn_unlock_all:", document.getElementById('btn_unlock_all') ? 'FOUND' : 'NOT FOUND');
    console.log("- btn_effect_shadow:", document.getElementById('btn_effect_shadow') ? 'FOUND' : 'NOT FOUND');
});

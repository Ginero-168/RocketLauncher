describe('install review for Marketplace scripts (js/script-review.js)', function () {
    test('without the review dialog nothing installs', async function () {
        window.loadPanelScript('js/script-scan.js');
        window.loadPanelScript('js/script-review.js');
        const choice = await TATA.scriptReview.open({ name: 'x', by: 'y', code: 'alert(1)', credits: [] });
        expect(choice).toBe('');
    });
});

// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    retries: 1,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        viewport: { width: 1280, height: 800 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
    projects: [
        // Setup auth principal
        {
            name: 'setup',
            testMatch: /auth\.setup\.js/,
        },

        // Tests operativos — usan auth guardado, dependen del setup
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/user.json',
            },
            dependencies: ['setup'],
            testIgnore: [
                /auth\.setup\.js/,
                /recepcionista\.setup\.js/,
                /onboarding\.spec\.js/,   // onboarding maneja su propio login
            ],
        },

        // Onboarding — sin storageState, hace login propio con usuario fresco
        {
            name: 'onboarding',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /onboarding\.spec\.js/,
        },

        // Setup recepcionista
        {
            name: 'setup-recepcionista',
            testMatch: /recepcionista\.setup\.js/,
        },

        // Tests de recepcionista
        {
            name: 'recepcionista',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/recepcionista.json',
            },
            dependencies: ['setup-recepcionista'],
            testMatch: /recepcionista\.spec\.js/,
        },
    ],
});

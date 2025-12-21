module.exports = {
    apps: [
        {
            name: 'nestjs-app',
            script: './dist/src/main.js',
            cwd: './',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                HOST: '0.0.0.0'
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            // Fix cho crypto warning
            node_args: '--no-warnings'
        }
    ]
};

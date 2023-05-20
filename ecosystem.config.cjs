module.exports = {
    apps: [
        {
            name : 'express',
            script: 'index.js',
            instances: 1,
            exec_mode: `cluster`,
            watch: true
        }
    ]
}
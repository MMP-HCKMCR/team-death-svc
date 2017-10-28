module.exports = {
    locale: 'en-GB',

    host_url: (process.env.HOST_URL || 'http://localhost:3001'),

    mssql: {
        user: 'MPP1', 
        password: 'K.F3;gGAJ)+4xUbk',
        server: 'ec2-52-211-119-222.eu-west-1.compute.amazonaws.com',
        database: 'MPP_TEAM_DEATH'
    },

    clockwork: {
        key: 'dce76bb6130ac3f7c01588489ed8f35b01eaa55a'
    }
}
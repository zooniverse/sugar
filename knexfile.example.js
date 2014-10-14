// Update with your config settings.

module.exports = {
  test: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'sugar_test',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 1,
      max: 1
    },
    migrations: {
      tableName: 'migrations'
    }
  },
  
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'sugar',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations'
    }
  },
  
  staging: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'sugar',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations'
    }
  },
  
  production: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'sugar',
      user:     'sugar',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations'
    }
  }
};

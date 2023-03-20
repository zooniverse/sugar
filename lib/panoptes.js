process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = {
  authenticator: async function(user_id, auth_token) {
    if (!(user_id && auth_token)) {
      return Promise.resolve({
        status: 200,
        success: true,
        loggedIn: false
      });
    }
    const url = `${process.env.PANOPTES_HOST}/api/me`;
    const opts = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.api+json; version=1',
        'Authorization': `Bearer ${auth_token}`
      }
    };
    try {
      const response = await fetch(url, opts);
      if (response.ok) {
        const body = await response.json();
        const user = body.users[0];
        if (user.id.toString() === user_id.toString()) {
          return {
            status: 200,
            success: true,
            name: user.display_name,
            loggedIn: true
          };
        } else {
          return {
            status: response.status,
            success: false
          };
        }
      } else {
        return {
          status: response.status,
          success: false
        };
      }
    } catch (error) {
      console.error(error);
      return {
        status: 503,
        success: false
      };
    }
  }
};

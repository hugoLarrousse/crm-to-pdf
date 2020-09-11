const axios = require('axios');

const timestamp = require('./timestamp');
const format = require('./format');

const hubspotBaseDomain = 'https://api.hubapi.com';

const getUsers = async (token, email, needUrl) => {
  const result = await axios.get(`${hubspotBaseDomain}/crm/v3/owners/`, {
    params: {
      hapikey: token,
      ...email && { email },
      limit: '100',
    },
  });
  if (!result || !result.data || !result.data.results) throw Error('no user found');
  const usersFormatted = format.users(result.data.results, token, needUrl);
  return usersFormatted;
};

const getDeals = async (token, startDate, userId) => {
  const allResults = [];
  let hasMore = false;
  let offset = null;
  do {
    const result = await axios.get(
      `${hubspotBaseDomain}/deals/v1/deal/recent/modified`,
      {
        params: {
          hapikey: token,
          count: 100,
          since: startDate,
          ...offset && { offset },
        },
      }
    );
    if (result && result.data && result.data.results) {
      allResults.push(...result.data.results);
      hasMore = result.data.hasMore;
      offset = result.data.offset;
    }
  } while (hasMore);
  return format.dealsHubspot(allResults, userId);
};

const getEngagements = async (token, startDate, userId) => {
  const sinceLastWeek = startDate || timestamp.lastWeekStartDate();
  const allResults = [];
  let hasMore = false;
  let offset = null;
  do {
    const result = await axios.get(
      `${hubspotBaseDomain}/engagements/v1/engagements/recent/modified`,
      {
        params: {
          hapikey: token,
          count: 250,
          since: sinceLastWeek,
          ...offset && { offset },
        },
      }
    );
    if (result && result.data && result.data.results) {
      allResults.push(...result.data.results);
      hasMore = result.data.hasMore;
      offset = result.data.offset;
    }
  } while (hasMore);
  return format.engagementsHubspot(allResults, sinceLastWeek, userId);
};

const getStages = async (token) => {
  const result = await axios.get(`${hubspotBaseDomain}/crm-pipelines/v1/pipelines/deals`,
    {
      params: {
        hapikey: token,
      },
    });
  if (!result || !result.data || !result.data.results) throw Error('no stages found');
  return format.stages([...result.data.results.map(s => s.stages)].flat());
};

exports.getDataForPdf = async (token, email) => {
  const startLastWeek = timestamp.lastWeekStartDate();
  const startWeek = timestamp.weekStartDate();
  const users = await getUsers(token, email);
  if (!users || users.length === 0) throw Error('no users found');
  const stages = await getStages(token);
  const deals = await getDeals(token, startLastWeek, email && users[0].id);
  const engagements = await getEngagements(token, startLastWeek, email && users[0].id);

  const count = format.count(users, deals, engagements, stages, startWeek, startLastWeek);
  return {
    startLastWeek, startWeek, team: users[0].team, count,
  };
};

exports.getUsers = getUsers;
exports.getDeals = getDeals;
exports.getEngagements = getEngagements;
exports.getStages = getStages;

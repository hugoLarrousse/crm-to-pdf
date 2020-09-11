const baseUrl = 'http://localhost:3007';

exports.users = (users, token, needUrl) => {
  return users.map(user => {
    return {
      id: user.id,
      email: user.email,
      firstname: user.firstName,
      lastname: user.lastName,
      team: user.teams[0].name,
      ...needUrl && { urlToCreatePdf: `${baseUrl}/pdf/${user.email}?api_key=${token}` },
    };
  });
};

exports.dealsHubspot = (deals, userId) => {
  return deals
    .filter(d => d.properties.hubspot_owner_id
      && d.properties.hubspot_owner_id.value
      && d.properties.dealstage
      && d.properties.dealstage.value
      && (userId ? String(d.properties.hubspot_owner_id.value) === String(userId) : true))
    .map(deal => {
      return {
        userId: String(deal.properties.hubspot_owner_id.value),
        stage: deal.properties.dealstage.value,
        createdAt: deal.properties.createdate && Number(deal.properties.createdate.value),
        createdAt2: deal.properties.createdate && new Date(Number(deal.properties.createdate.value)),
        amount: (deal.properties.amount && Number(deal.properties.amount.value)) || 0,
        all: deal.properties.dealname.value,
      };
    });
};

exports.engagementsHubspot = (engagements, since, userId) => {
  return engagements
    .filter(e => e.engagement.ownerId
      && e.engagement.type
      && e.engagement.createdAt >= since
      && (userId ? String(e.engagement.ownerId) === String(userId) : true))
    .map(engagement => {
      return {
        userId: String(engagement.engagement.ownerId),
        type: engagement.engagement.type,
        createdAt: Number(engagement.engagement.createdAt),
      };
    });
};

exports.stages = (stages) => {
  const stagesFormatted = stages.filter(s => s.active && s.metadata && [1, 0, '1.0', '0.0'].includes(s.metadata.probability));
  return {
    won: stagesFormatted.filter(f => [1, '1.0'].includes(f.metadata.probability)).map(m => m.stageId),
    lost: stagesFormatted.filter(f => [0, '0.0'].includes(f.metadata.probability)).map(m => m.stageId),
  };
};

const countDealsByTimestamp = (deals, stages, timestamp1, timestamp2) => {
  const dealsUser = deals.filter(d => d.createdAt > timestamp1 && (timestamp2 ? d.createdAt < timestamp2 : true));
  const won = dealsUser.filter(du => stages.won.includes(du.stage));
  const lost = dealsUser.filter(du => stages.lost.includes(du.stage));

  const wonAmount = won.reduce((prev, curr) => prev + curr.amount, 0);
  const lostAmount = lost.reduce((prev, curr) => prev + curr.amount, 0);

  return {
    won: won.length,
    wonAmount,
    lost: lost.length,
    lostAmount,
    open: deals.length - won.length - lost.length,
    openCount: deals.reduce((prev, curr) => prev + curr.amount, 0) - wonAmount - lostAmount,
  };
};

const countDeals = (user, deals, stages, timestampCurr, timestampPrev) => {
  const dealsUser = deals.filter(d => d.userId === user.id);

  return {
    current: countDealsByTimestamp(dealsUser, stages, timestampCurr),
    last: countDealsByTimestamp(dealsUser, stages, timestampPrev, timestampCurr),
  };
};

// TO BE REFACTORED
const countEngagements = (user, engagements, timestampCurr, timestampPrev) => {
  const engagementsUser = engagements.filter(e => e.userId === user.id);
  const engagementsUserCurr = engagementsUser.filter(e => e.createdAt > timestampCurr);
  const engagementsUserPrev = engagements.filter(e => e.createdAt > timestampPrev && e.createdAt < timestampCurr);
  const entriesCurr = Object.entries(engagementsUserCurr.reduce((prev, curr) => {
    prev[curr.type] = prev[curr.type] ? prev[curr.type] + 1 : 1;
    return prev;
  }, {})).sort((a, b) => b[1] - a[1]);
  const entriesCurrKeys = entriesCurr.map(t => t[0]);
  const entriesPrev = Object.entries(engagementsUserPrev.reduce((prev, curr) => {
    prev[curr.type] = prev[curr.type] ? prev[curr.type] + 1 : 1;
    return prev;
  }, {})).sort((a, b) => b[1] - a[1]);
  const definitivePrev = [];

  for (const entriesCurrKey of entriesCurrKeys) {
    definitivePrev.push(entriesPrev.find(t => t[0] === entriesCurrKey) || [entriesCurrKey, 0]);
  }

  for (const indexEntriesCurr in entriesCurr) {
    [, entriesCurr[indexEntriesCurr][2]] = definitivePrev[indexEntriesCurr];
  }

  return entriesCurr;
};

exports.count = (users, deals, engagements, stages, timestampCurr, timestampPrev) => {
  const finalArray = [];
  for (const user of users) {
    const engagementsC = countEngagements(user, engagements, timestampCurr, timestampPrev);
    engagementsC.length = 4;
    finalArray.push({
      user,
      deal: countDeals(user, deals, stages, timestampCurr, timestampPrev),
      engagements: engagementsC.filter(e => e),
    });
  }
  return finalArray;
};

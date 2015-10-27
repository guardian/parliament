import doT from 'olado/doT'
import template from '../templates/division.html!text'
import strftime from 'samsonjs/strftime'
import reqwest from 'reqwest'
import iframeMessenger from 'guardian/iframe-messenger'
import queue from 'mbostock/queue'
import bowser from 'ded/bowser'

var renderTemplate = doT.template(template);

var displayOrder = [
    'Conservative',
    'Labour',
    'Labour (Co-op)',
    'Scottish National Party',
    'Liberal Democrat',
    'Green Party',
    'Democratic Unionist Party',
    'UK Independence Party',
    'Social Democratic & Labour Party',
    'Ulster Unionist Party',
    'Independent',
    'Plaid Cymru',

    'Crossbench',
    'Independent Labour',
    'Bishops',
    'Non-affiliated'

]

var rebelOrder = [
    'Conservative',
    'Labour',
    'Labour (Co-op)',
    'Scottish National Party',
    'Liberal Democrat',
    'Green Party',
    'Democratic Unionist Party',
    'UK Independence Party',
    'Social Democratic & Labour Party',
    'Ulster Unionist Party',
    'Plaid Cymru'
]

function find(arr, fn) {
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) return arr[i];
    }
}

function fetchJson(url, callback) {
    reqwest({ url: url, type: 'json', contentType: 'application/json' })
        .then(json => callback(null, json))
        .catch(err => callback(err))
}

export function init({el}) {
    var protocol = (bowser.msie && bowser.version < 10) ? '//' : 'https://';
    var match = /id=(\d+)/.exec(window.location.search);
    if (match) {
        queue()
            .defer(fetchJson, `data/divisions/${match[1]}.json`)
            .defer(fetchJson, 'data/membersfordivisions.json')
            .defer(fetchJson, `${protocol}interactive.guim.co.uk/docsdata/1K9vpQXAlfs83kU0lUBAsX_UsB_EcTaQWiOWs8XyuFNI.json`)
            .await((error, division, members, metaSheet) => {
                if (error) return console.log(error);

                console.log(division.AyeMembers.length, division.NoeMembers.length);

                var meta = find(metaSheet.sheets.divisions, d => d.id == division.Id);

                var rebelCount = rebelOrder
                    .filter(party => division.rebels[party])
                    .map(party => division.rebels[party].length)
                    .reduce((a,b) => a + b)

                var parties = Object.keys(division.partyLines).sort((a,b) => displayOrder.indexOf(a) - displayOrder.indexOf(b));
                var voteCounts = {};
                parties.forEach(party => {
                    voteCounts[party] = {
                        Aye: division.AyeMembers.filter(member => member.Party === party).length,
                        Noe: division.NoeMembers.filter(member => member.Party === party).length
                    };
                });

                var ayeError = division.AyeCount - division.AyeMembers.length,
                    noeError = division.NoeCount - division.NoeMembers.length;

                if (ayeError > 0 || noeError > 0) {
                    voteCounts['Unknown'] = {
                        Aye: division.AyeCount - division.AyeMembers.length,
                        Noe: division.NoeCount - division.NoeMembers.length
                    }
                    displayOrder.push('Unknown');
                    parties.push('Unknown');
                }

                var membersById = {};
                [].concat(division.AyeMembers,division.NoeMembers).forEach(member => membersById[member.Id] = member)

                var rebels,
                    showRebels = /commons/i.test(division.House);
                if (showRebels) {
                    rebels = {}
                    rebelOrder.forEach(party => {
                        if (division.rebels[party])
                            rebels[party] = division.rebels[party]
                                .map(memberId => membersById[memberId])
                                .sort((a,b) => {
                                    var am = !!members[a.Id].post,
                                        bm = !!members[b.Id].post;
                                    if ((am && bm) || (!am && !bm)) return a.Name > b.Name ? 1 : -1;
                                    else return am ? -1 : 1;
                                })
                    })

                }

                el.innerHTML = renderTemplate({
                    division: division,
                    title: meta ? meta.title : division.DebateSection.trim(),
                    desc: meta ? meta.desc : null,
                    height: Math.max(division.AyeCount, division.NoeCount, division.AyeMembers.length, division.NoeMembers.length),
                    voteCounts: voteCounts,
                    parties: parties,
                    rebels: rebels,
                    rebelCount: rebelCount,
                    // rebelHeight: Math.max.apply(null, rebels.map(r => r.count)),
                    // rebelCount: [].concat(rebels.map(r => r.count),0).reduce((a,b) => a+b),
                    winningVote: division.AyeMembers.length > division.NoeMembers.length ? 'Aye' :
                                    division.AyeMembers.length < division.NoeMembers.length ? 'Noe' : 'Tie',
                    dateString: strftime('%k:%M on %B %e %Y', new Date(division.Date)),
                    dateStringShort: strftime('%k:%M on %b %e %Y', new Date(division.Date)),
                    turnout: division.AyeMembers.length + division.NoeMembers.length,
                    members: members,
                    rebelOrder: rebelOrder,
                });

                var rebelExpandButton = el.querySelector('.rebel-expand')
                if (rebelExpandButton) {
                    rebelExpandButton.addEventListener('click', evt => {
                        rebelExpandButton.parentElement.removeChild(rebelExpandButton);
                        el.querySelector('.rebels').className = 'rebels rebels--show';
                    })
                }

                var hoverEl = el.querySelector('.division__vote-hover');
                var votesEl = el.querySelector('.division__votes');
                var divisionEl = el.querySelector('.division');

                votesEl.addEventListener('mouseover', evt => {
                    if (evt.target.className === 'votestack__segment') {
                        var embedMidPoint = divisionEl.getBoundingClientRect().width;
                        var party = evt.target.getAttribute('party');
                        var vote = evt.target.getAttribute('vote');
                        var rect = evt.target.getBoundingClientRect();
                        hoverEl.style.display = 'block';
                        hoverEl.innerHTML = `${party} - <strong>${voteCounts[party][vote] } votes</strong>`;
                        var midPoint = rect.left + rect.width/2;
                        var flipped = midPoint > embedMidPoint/2;

                        var offset = flipped ? - hoverEl.getBoundingClientRect().width : 0;
                        hoverEl.className = 'division__vote-hover' + (flipped ? ' division__vote-hover--flipped' : '');

                        hoverEl.style.top = `${rect.top - 32}px`;
                        hoverEl.style.left = `${midPoint + offset}px`;
                    }
                })
                votesEl.addEventListener('mouseout', evt => {
                    if (evt.target.className === 'votestack__segment') {
                        hoverEl.style.display = 'none';
                    }
                })

                iframeMessenger.resize()
            })
    } else {
        throw new Error('missing division id in query string')
    }
}

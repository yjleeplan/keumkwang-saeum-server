const Knex = require('knex');
const _ = require('lodash');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');

const connection = {
    host: process.env.SAEUM_DB_HOST,
    user: process.env.SAEUM_DB_USER,
    password: process.env.SAEUM_DB_PASSWORD,
    database: process.env.SAEUM_DB_DATABASE,
    port: process.env.SAEUM_DB_PORT
};

const knex = Knex({
    client: 'mysql',
    connection,
});

const generateId = () => {
    return crypto.createHash('sha1').update(uuid()).digest('hex');
};

const daylist = [
    'day1',
    'day2',
    'day3',
    'day4',
    'day5',
    'day6',
    'day7',
    'day8',
    'day9',
    'day10',
    'day11',
    'day12',
];

const okResponse = (data) => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify(data),
    };
};

const errorResponse = (code, message) => {
    return {
        statusCode: code,
        headers: {
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ code, message }),
    };
};

exports.handler = async (event) => {
    try {
        const { attendance_id: id } = event.pathParameters ? event.pathParameters : {};
        if (_.isEmpty(id)) return errorResponse(401, '요청값이 누락되었습니다.');

        const parsedBody = JSON.parse(event.body);
        const isAdmin = parsedBody.is_admin;
        const pickedDay = _.pick(parsedBody, daylist);
        if (_.isEmpty(pickedDay)) return errorResponse(400, '변경할 정보를 입력해주세요.');

        const existAttendance = await knex('attendance').select().where({ id }).then(res => res[0]);
        if (_.isEmpty(existAttendance)) return errorResponse(404, '출석 정보를 찾지 못했습니다.');
        const existUser = await knex('user').select().where({ id: existAttendance.user_id }).then(res => res[0]);
        if (_.isEmpty(existUser)) return errorResponse(404, '사용자를 찾지 못했습니다.');

        if (!isAdmin && _.values(pickedDay)[0] === 'B' && _.includes(_.values(existAttendance), 'B')) return errorResponse(403, '수요예배 출석체크는 한번만 가능합니다.');

        await knex.transaction(async (trx) => {
            try {
                await knex('attendance').transacting(trx).update({
                    ...pickedDay,
                    updated_at: new Date(),
                }).where({ id });
                await knex('history').transacting(trx).insert({
                    id: generateId(),
                    grantor_id: existUser.id,
                    grantor_name: existUser.name,
                    action: 'update_attendance',
                    details: JSON.stringify(pickedDay),
                    grantee_id: existUser.id,
                    grantee_name: existUser.name,
                });
                trx.commit;
            } catch (error) {
                trx.rollback;
                throw error;
            }
        });
        const updatedAttendance = await knex('attendance').select().where({ id }).then(arr => arr[0]);

        return okResponse(updatedAttendance);
    } catch (error) {
        return errorResponse(500, '서버 에러');
    }
};

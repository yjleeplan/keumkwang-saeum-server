const Knex = require('knex');
const _ = require('lodash');

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
        const { user_id: id } = event.pathParameters ? event.pathParameters : {};
        if (_.isEmpty(id)) return errorResponse(401, '요청값이 누락되었습니다.');

        const selectedUser = await knex('user')
            .select(
                'attendance.*', 'user.*',
                'attendance.id as attendance_id', 'attendance.updated_at as attendance_updated_at', 'attendance.created_at as attendance_created_at',
            )
            .where({ 'user.id': id })
            .leftJoin('attendance', 'attendance.user_id', 'user.id')
            .then(arr => {
                if (_.isEmpty(arr)) return;
                const obj = arr[0];
                return {
                    ..._.pick(obj, ['id', 'name', 'department', 'birthday', 'updated_at', 'created_at']),
                    attendance: {
                        id: obj.attendance_id,
                        user_id: obj.user_id,
                        daylist: [
                            { day1: obj.day1 },
                            { day2: obj.day2 },
                            { day3: obj.day3 },
                            { day4: obj.day4 },
                            { day5: obj.day5 },
                            { day6: obj.day6 },
                            { day7: obj.day7 },
                            { day8: obj.day8 },
                            { day9: obj.day9 },
                            { day10: obj.day10 },
                            { day11: obj.day11 },
                            { day12: obj.day12 },
                        ],
                        updated_at: obj.attendance_updated_at,
                        created_at: obj.attendance_created_at,
                    },
                };
            });
        if (_.isEmpty(selectedUser)) return errorResponse(404, '사용자를 찾지 못했습니다.');

        return okResponse(selectedUser);
    } catch (error) {
        return errorResponse(500, '서버 에러');
    }
};

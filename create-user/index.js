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
        const { name, department, birthday } = JSON.parse(event.body);
        const user_id = generateId();

        if (_.isEmpty(name)) return errorResponse(400, '이름을 입력해주세요.');
        if (_.isEmpty(department)) return errorResponse(400, '소속을 선택해주세요.');
        if (_.isEmpty(birthday)) return errorResponse(400, '생년월일을 입력해주세요.');

        const existUsers = await knex('user').select().where({ name, department, birthday });
        if (!_.isEmpty(existUsers)) return errorResponse(409, '이미 사용자가 존재합니다.');

        await knex.transaction(async (trx) => {
            try {
                await knex('user').transacting(trx).insert({
                    id: user_id,
                    name,
                    department,
                    birthday,
                });
                await knex('attendance').transacting(trx).insert({
                    id: generateId(),
                    user_id,
                });
                await knex('history').transacting(trx).insert({
                    id: generateId(),
                    grantor_id: user_id,
                    grantor_name: name,
                    action: 'create_user',
                    details: JSON.stringify({ name, department, birthday }),
                    grantee_id: user_id,
                    grantee_name: name,
                });
                trx.commit;
            } catch (error) {
                trx.rollback;
                throw error;
            }
        });
        const createdUser = await knex('user').select().where({id: user_id}).then(arr => arr[0]);

        return okResponse(createdUser);
    } catch (error) {
        return errorResponse(500, '서버 에러');
    }
};

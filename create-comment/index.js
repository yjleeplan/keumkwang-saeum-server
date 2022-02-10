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
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify(data),
    };
};

const errorResponse = (code, message) => {
    return {
        statusCode: code,
        headers: {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify({ code, message }),
    };
};

exports.handler = async (event) => {
    try {
        const { user_name, content } = JSON.parse(event.body);
        const id = generateId();

        if (_.isEmpty(user_name)) return errorResponse(400, '이름을 입력해주세요.');
        if (_.isEmpty(content)) return errorResponse(400, '댓글을 입력해주세요.');

        await knex('comment').insert({
            id,
            user_name,
            content,
        });
        const createdComment = await knex('comment').select().where({ id }).then(arr => arr[0]);

        return okResponse(createdComment);
    } catch (error) {
        return errorResponse(500, '서버 에러');
    }
};

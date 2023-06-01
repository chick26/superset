import logging
from urllib import parse
import simplejson as json
from flask import request, Response
from flask_appbuilder.api import expose, protect, rison
from flask_appbuilder.models.sqla.interface import SQLAInterface
from marshmallow import ValidationError
from superset import app
from superset.extensions import event_logger
from superset.models.sql_lab import Query
from superset.superset_typing import FlaskResponse
from superset.views.base_api import BaseSupersetApi, requires_json
from superset.views.base import json_success
import requests
from superset.openai.schemas import (
  GeneratePayloadSchema
)

config = app.config
logger = logging.getLogger(__name__)


class OpenaiRestApi(BaseSupersetApi):
    
    resource_name = "openai"
    allow_browser_login = True
    generate_model_schema = GeneratePayloadSchema()
    class_permission_name = "OPENAI"

    @expose("/generate/", methods=("POST",))
    @requires_json
    @event_logger.log_this
    def generate_gpt_query(self) -> FlaskResponse:
        '''
        Open ai
        '''
        api_key = app.config['OPENAI_API_KEY']
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
          "Content-Type": "application/json",
          "Authorization": f"Bearer {api_key}"
        }
        
        try:
            requestJson = self.generate_model_schema.load(request.json)
        except ValidationError as error:
            return self.response_400(message=error.messages)
        
        try:
            data = {
                "model":"gpt-3.5-turbo",
                "messages": [{"role":"user","content": requestJson['prompt']}],
                # "messages": [{"role":"user","content": "say this test"}],
                "max_tokens":800,
                "temperature":0.5,
                "frequency_penalty":0,
                "presence_penalty":0
            }
            response = requests.post(url, headers=headers, json=data).json()
            # response = {
            #     "id": "chatcmpl-7MVgMcuDicF5jpVuyUGwnZQUL37jP",
            #     "object": "chat.completion",
            #     "created": 1685599358,
            #     "model": "gpt-3.5-turbo-0301",
            #     "usage": {
            #         "prompt_tokens": 101,
            #         "completion_tokens": 12,
            #         "total_tokens": 113
            #     },
            #     "choices": [
            #         {
            #             "message": {
            #                 "role": "assistant",
            #                 "content": "SELECT SUM(num) AS total_people \nFROM birth_names;"
            #             },
            #             "finish_reason": "stop",
            #             "index": 0
            #         }
            #     ]
            # }

            return json_success(json.dumps(response), 200)

        except Exception:
            payload = {"errors"}
            return self.response(403, **payload)

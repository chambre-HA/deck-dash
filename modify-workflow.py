import json, sys

wf = json.load(open(sys.argv[1]))

# 1. Change webhook responseMode to "responseNode"
for node in wf['nodes']:
    if node['name'] == 'Webhook Trigger':
        node['parameters']['responseMode'] = 'responseNode'
        break

# 2. Add "Generate Job ID" code node
generate_job_id_node = {
    "parameters": {
        "jsCode": "const { topic_id, topic_name, count } = $input.item.json.body;\nconst jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;\nreturn {\n  jobId,\n  topic_id,\n  topic_name,\n  count: count || 30,\n  estimatedSeconds: 180\n};"
    },
    "name": "Generate Job ID",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [-3248, 64]
}

# 3. Add "Respond to Webhook" node (returns jobId immediately)
respond_node = {
    "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ jobId: $json.jobId, estimatedSeconds: $json.estimatedSeconds }) }}",
        "options": {}
    },
    "name": "Respond with Job ID",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.1,
    "position": [-3136, -120]
}

# 4. Add "Save Result to R2" — using S3 node like chapter-craft does
r2_save_node = {
    "parameters": {
        "operation": "upload",
        "bucketName": "deck-dash",
        "fileName": "=jobs/{{ $('Generate Job ID').item.json.jobId }}.json",
        "additionalFields": {}
    },
    "name": "Save Result to R2",
    "type": "n8n-nodes-base.s3",
    "typeVersion": 1,
    "position": [-48, 272],
    "credentials": {
        "s3": {
            "id": "blwgRtrPEFVMkPba",
            "name": "S3 account"
        }
    }
}

# 5. Add "Build R2 Payload" code node to format the JSON before S3 upload
r2_payload_node = {
    "parameters": {
        "jsCode": "const jobData = $('Generate Job ID').item.json;\nreturn {\n  json: {\n    success: true,\n    topic_id: jobData.topic_id,\n    topic_name: jobData.topic_name,\n    cardCount: jobData.count\n  }\n};"
    },
    "name": "Build R2 Payload",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [-272, 272]
}

wf['nodes'].extend([generate_job_id_node, respond_node, r2_payload_node, r2_save_node])

# 6. Update connections
# Webhook Trigger -> Generate Job ID (instead of Build Claude Prompt)
wf['connections']['Webhook Trigger'] = {
    "main": [[{"node": "Generate Job ID", "type": "main", "index": 0}]]
}

# Generate Job ID -> Respond with Job ID AND Build Claude Prompt (parallel)
wf['connections']['Generate Job ID'] = {
    "main": [[
        {"node": "Respond with Job ID", "type": "main", "index": 0},
        {"node": "Build Claude Prompt", "type": "main", "index": 0}
    ]]
}

# Append to Google Sheets -> Build R2 Payload -> Save Result to R2
wf['connections']['Append to Google Sheets'] = {
    "main": [[{"node": "Build R2 Payload", "type": "main", "index": 0}]]
}
wf['connections']['Build R2 Payload'] = {
    "main": [[{"node": "Save Result to R2", "type": "main", "index": 0}]]
}

json.dump(wf, open(sys.argv[2], 'w'), indent=2)
print("Modified workflow saved to", sys.argv[2])

# OpenAI Builder Lab

This repository contains a starter project to help you go through the Builder Lab challenges faster.

It consists of a NextJS application, in the `frontend` folder, and an optional python backend in the `python-backend` folder.
You can use the built-in back-end in the NextJS application (`/api/route`), or change the endpoint to point to the python backend if you prefer using python.

## How to use

1. Download or clone this repository:

```bash
git clone https://github.com/openai/openai-builder-lab.git
```

2. Navigate to the starting point NextJS app:

```bash
cd starting_point/frontend
```

3. Set your OpenAI API key:

2 options:

- Set the `OPENAI_API_KEY` environment variable [globally in your system](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)
- Set the `OPENAI_API_KEY` environment variable in the project: Create a `.env` file at the root of the project and add the following line:

```
OPENAI_API_KEY=<your_api_key>
```

4. Install dependencies:

```bash
npm install
```

5. Run the application:

```bash
npm run dev
```

6. (Optional) Run the python backend:

   a. Navigate to the `python-backend` folder:

   ```bash
   cd ../python-backend
   ```

   b. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

   c. Run the backend:

   ```bash
   python app.py
   ```

7. Start the challenges:

Go through the lab by adding gradually the code needed for each challenge.
Feel free to ask our team for help at any time!

## App structure

### UI

The frontend part of the application lives in `frontend/components`.
If you want to customize the UI, you can do so by editing the files in this folder or adding new components.

### Code Logic

All the code logic lives in `frontend/lib`.
This is where the logic related to making the assistant work is.
You can edit those files, following the suggested structure, to progress through the challenges.

For example:

- `constants.ts` contains all constants such as system prompt, initial message, etc.
- `tools.ts` is meant to contain logic related to the tools the assistant has access to.
- `assistant.ts` contains logic to send and receive messages to the API via the backend.

The messages are stored in a store shared across components, located in `frontend/stores/useConversationStore.ts`. You shouldn't have to edit this file.

### Backend

The backend routes are located in `frontend/app/api`, or `python-backend/app.py`.

This is where you can communicate with APIs, including OpenAI APIs.
Feel free to add more routes as you progress through the challenges.

The first route `get_response` is provided as an example, and you can follow the same structure to add more routes.

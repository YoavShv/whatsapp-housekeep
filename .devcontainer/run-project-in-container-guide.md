# Running Claude Code Safely in a Dev Container

This guide outlines how to run Claude Code within a Docker container to isolate it from your local machine, preventing accidental file deletion or system changes in the OS. The full Anthropic Guide is [here](https://code.claude.com/docs/en/devcontainer)


## Prerequisites

*   **Docker:** Install [Docker Engine](https://docs.docker.com/engine/install/) or [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is currently **running**. Run in terminal  ```sudo systemctl status docker``` and check for ```Active: active (running)```
*   **VS Code:** Install VS Code with "Dev Containers" extension. For more information on the extention, 
[look here](https://code.visualstudio.com/docs/devcontainers/containers) 
*   **VS Code version:** must be > 1.109.3. Upgrade if needed.


## Installation Steps

1.  **Clone the Repository:**
Clone the Anthropic dev container repository to your local machine  
```git clone https://github.com/anthropics/claude-code```
2.  **Copy .devcontainer folder:** Copy only this folder to your git repo project.
3.  **Open in VS Code:** Navigate to your project and open it in VS Code.
4.  **Build Container:** When prompted, click **"Reopen in Container"**. This will automatically build the Docker environment for your project.
5.  **Initialize Claude - VS code terminal:**
    *   Open the integrated terminal of VS code(now running inside Docker).
    *   Run the command: `claude`.
    *   Follow the prompts to authenticate.
6.  **Initialize Claude - External terminal (like GNOME):**
    *   run the following command in the terminal
    ```
    docker exec -it -u node -w /workspace \
      -e CLAUDE_CONFIG_DIR=/home/node/.claude \
      -e NODE_OPTIONS=--max-old-space-size=4096 \
      $(docker ps --format "{{.ID}}\t{{.Image}}" | grep <PROJECT_NAME> | cut -f1) /bin/zsh
    ```
    **It will get you inside the docker.**
    *   Run the command: `claude`.
    *   Follow the prompts to authenticate.



# A great tip
You can add this alias in the ~/bash_aliases:
```
alias myProj-clubroom='devcontainer up --workspace-folder ~/Claude/projs/clubroom > /dev/null 2>&1; \
    docker exec -it -u node -w /workspace \
    -e CLAUDE_CONFIG_DIR=/home/node/.claude \
    -e NODE_OPTIONS=--max-old-space-size=4096 \
    $(docker ps --format "{{.ID}}\t{{.Image}}" | grep clubroom | cut -f1) /bin/zsh'
```
when running ```myProj-clubroom``` the command will:
1. create a docker (if not already created)
2. start  the docker (if not already started)  
3. this works from anywhere in your OS

## Usage
Once authenticated, you can use Claude normally within the terminal. It will have read/write access only to the files inside the container or those explicitly mounted.

# Clean dockers
## Stop all running containers
```docker stop $(docker ps -aq)```
## Remove all containers
```docker rm $(docker ps -aq)```
## Remove all images
```docker rmi $(docker images -q)```
## All at once
```docker stop $(docker ps -aq) && docker rm $(docker ps -aq) && docker rmi -f $(docker images -q)```



====================================


## Configuration: working on Local Projects

To edit existing local projects without cloning them inside the container, you must **mount** them as volumes.
1.  Open `devcontainer.json` in the container.
2.  Locate the `mounts` section.
3.  Add the path to your local project repository.
4.  Save the file and click **"Rebuild"** when prompted by VS Code.
5.  Your local repo will now appear in the container's file explorer and terminal, allowing Claude to safely edit those specific files.

